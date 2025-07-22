import { NextApiRequest, NextApiResponse } from 'next';
import { 
  ExchangeService, 
  ExchangeVersion, 
  CalendarFolder, 
  Uri, 
  WebCredentials, 
  WellKnownFolderName,
  CalendarView,
  DateTime,
  AppointmentSchema,
  PropertySet
} from 'ews-javascript-api';

// Helper to process promises in batches
async function batchPromises<T>(items: T[], batchSize: number, fn: (item: T) => Promise<any>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, token, start_date, end_date } = req.body;
    
    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    const usernameOnly = username.split('@')[0];
    const ewsDomain = process.env.EWS_DOMAIN;
    if (!ewsDomain) {
      throw new Error('EWS_DOMAIN is not defined in environment variables');
    }
    service.Credentials = new WebCredentials(`${ewsDomain}\\${usernameOnly}`, token);
    const ewsServiceUrl = process.env.EWS_SERVICE_URL;
    if (!ewsServiceUrl) {
      throw new Error('EWS_SERVICE_URL is not defined in environment variables');
    }
    service.Url = new Uri(ewsServiceUrl);
    
    // Access calendar
    const calendar = await CalendarFolder.Bind(service, WellKnownFolderName.Calendar);
    
    // Use provided date range
    const ewsStartDate = new DateTime(new Date(start_date));
    const ewsEndDate = new DateTime(new Date(end_date));
    
    // Create calendar view
    const calendarView = new CalendarView(ewsStartDate, ewsEndDate);
    calendarView.PropertySet = new PropertySet(
      AppointmentSchema.Subject, 
      AppointmentSchema.Start, 
      AppointmentSchema.End, 
      AppointmentSchema.Location,
      AppointmentSchema.Duration,
      AppointmentSchema.IsAllDayEvent
    );
    
    // Find appointments
    const appointments = await calendar.FindAppointments(calendarView);
    // Load details for each appointment (all needed properties)

    const fullPropertySet = new PropertySet(
      AppointmentSchema.Subject,
      AppointmentSchema.Start,
      AppointmentSchema.End,
      AppointmentSchema.Location,
      AppointmentSchema.Duration,
      AppointmentSchema.IsAllDayEvent,
      AppointmentSchema.RequiredAttendees,
      AppointmentSchema.OptionalAttendees,
      AppointmentSchema.Organizer
    );
    
    await batchPromises(appointments.Items, 20, appt => appt.Load(fullPropertySet));
    // Convert to JSON format
    const meetings = appointments.Items.map(appointment => {
      // Extract all attendee emails
      const requiredEmails: string[] = [];
      if (appointment.RequiredAttendees && appointment.RequiredAttendees.Count > 0) {
        const attendees = (appointment.RequiredAttendees as any).Items as any[];
        
        for (let i = 0; i < attendees.length; i++) {
          const attendee = attendees[i];
          if (attendee && attendee.Address) {
            requiredEmails.push(attendee.Address);
          }
        }
      }
      const optionalEmails: string[] = [];
      if (appointment.OptionalAttendees && appointment.OptionalAttendees.Count > 0) {
        const attendees = (appointment.OptionalAttendees as any).Items as any[];
        for (let i = 0; i < attendees.length; i++) {
          const attendee = attendees[i];
          if (attendee && attendee.Address) {
            optionalEmails.push(attendee.Address);
          }
        }
      }
      // Ensure unique participants
      const participants = Array.from(new Set([...requiredEmails, ...optionalEmails]));
      return {
        id: appointment.Id.UniqueId,
        subject: appointment.Subject,
        start: appointment.Start.ToISOString(),
        end: appointment.End.ToISOString(),
        location: appointment.Location,
        duration: appointment.Duration.TotalMinutes,
        isAllDay: appointment.IsAllDayEvent,
        isCancelled: false, // Default value since property not available
        organizer: appointment.Organizer ? appointment.Organizer : '',
        requiredAttendees: requiredEmails,
        optionalAttendees: optionalEmails,
        participants: participants.length,
        body: '', // Default value since property not available
        categories: [] // Simplified for now
      };
    });

    res.status(200).json({
      success: true,
      meetings: meetings,
      totalMeetings: meetings.length,
      dateRange: {
        start: ewsStartDate.ToISOString(),
        end: ewsEndDate.ToISOString(),
        start_date: start_date,
        end_date: end_date
      }
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 
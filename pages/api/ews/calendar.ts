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
  PropertySet,
  OAuthCredentials
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
  const { accessToken, startDateTime, endDateTime } = req.body;
  if (!accessToken) return res.status(401).json({ message: "No access token" });
  if (!startDateTime || !endDateTime) return res.status(400).json({ message: "Missing date range" });

  // const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=
  //               ${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}`;
  // const graphRes =
  //  await fetch(url, {
  //   headers: {
  //     Authorization: `Bearer ${accessToken}`,
  //     "Content-Type": "application/json",
  //   },
  // });

  // const data = await graphRes.json();
  // if (!graphRes.ok) return res.status(graphRes.status).json(data);
  // res.status(200).json(data);
  try {
    // const { start_date, end_date } = req.body;
    
    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    // const usernameOnly = username.split('@')[0];
    // service.Credentials = new WebCredentials(`RU1000\\${usernameOnly}`, token);
    service.Url = new Uri("https://owa.lemanapro.ru/EWS/Exchange.asmx");
    service.Credentials = new OAuthCredentials(accessToken)
    
    // Access calendar
    const calendar = await CalendarFolder.Bind(service, WellKnownFolderName.Calendar);
    
    // Use provided date range
    const ewsStartDate = new DateTime(new Date(startDateTime));
    const ewsEndDate = new DateTime(new Date(endDateTime));
    
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
    
    await batchPromises(appointments.Items, 5, appt => appt.Load(fullPropertySet));
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
        organizer: appointment.Organizer ? appointment.Organizer.Name : '',
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
        start_date: startDateTime,
        end_date: endDateTime
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
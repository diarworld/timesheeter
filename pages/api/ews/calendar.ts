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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, token, start_date, end_date } = req.body;
    
    const service = new ExchangeService(ExchangeVersion.Exchange2016);
    const usernameOnly = username.split('@')[0];
    service.Credentials = new WebCredentials(`RU1000\\${usernameOnly}`, token);
    service.Url = new Uri("https://owa.lemanapro.ru/EWS/Exchange.asmx");
    
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
    
    // Convert to JSON format
    const meetings = appointments.Items.map(appointment => ({
      id: appointment.Id.UniqueId,
      subject: appointment.Subject,
      start: appointment.Start.ToISOString(),
      end: appointment.End.ToISOString(),
      location: appointment.Location,
      duration: appointment.Duration.TotalMinutes,
      isAllDay: appointment.IsAllDayEvent,
      isCancelled: false, // Default value since property not available
      organizer: '', // Default value since property not available
      body: '', // Default value since property not available
      categories: [] // Simplified for now
    }));

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
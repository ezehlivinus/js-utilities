const { dayjs } = require('../../bin/config/dayjs');
const { WORK_HOUR } = require('./constantsService');

const { TWENTY_FOUR_HOUR } = WORK_HOUR;

/**
   * @description add time to a date
   * @param {Date} date date to add time to
   * @param {string} time time to add // example: 09:00am
   * @returns {Promise<Date>} datetime, date with time added
   */
exports.setTime = async (date, time) => {
  const _date = await this.getFullDate(date);
  const _time = this.addSpaceBeforeMeridian(this.normaliseTime(time));
  const datetimeString = `${_date} ${_time}`;
  const datetime = dayjs(datetimeString);

  if (datetime.isValid()) {
    return datetime;
  }
  throw new Error('DateTimeService.setTime(): Invalid date and time');
};

exports.getFullDate = async (date) => {
  // something like this 2020-05-20
  const fullDate = dayjs(date).format().split('T')[0];

  if (dayjs(fullDate).isValid()) {
    return fullDate;
  }
  throw new Error(`Invalid date ${fullDate}`);
};

/**
   * @description format time in the format hh:mm:pm
   * @param {*} time time to format // example: 09:00am
   * @returns {string} formatted time // example: 09:00:am
   */
exports.formatTime = async (time) => {
  const timeSplit = time.split(':');

  const hour = timeSplit[0];

  // minuteAMPM => '00pm'
  const minuteAMPM = timeSplit[1];
  const minute = minuteAMPM.slice(0, 2); // '00'

  const ampm = minuteAMPM.slice(2); // 'pm'

  return `${hour}:${minute}:${ampm}`;
};

/**
 * @description generate time range for given start time, end time and interval
 * @param {string} startTime start time in 24 hour format: 08:00
 * @param {string} endTime end time in 24 hour format: 17:00
 * @param {string} interval interval or duration in time format: 00:30 (30 minutes),
 * 01:15 (1 hour 15 minutes), 00:15 is used if interval is 00:00
 * @param {string} endDate end date in format: YYYY-MM-DD, default is today
 * @param {string} startDate start date in format: YYYY-MM-DD. default is today
 * @param {string} locale locale of the time, default is en-US
 * @param {boolean} hour12 if true, 12 hour time is used, default is false
 * @returns {object} { time [], date[], datetime[] }, datetime is in format:
 * YYYY-MM-DDTHH:mm:ss.SSSZ +1 offset, usually as YYYY-MM-DDTHH:mm:ss+01:00,
 * if time range exists, null, otherwise
 * @example generateTimeRange({
 * startTime: '08:00',
 * endDate: '17:00',
 * interval: '00:30',
 * startDate: '2022-02-20',
 * endDate: '2022-02-20',
 * local: 'en-US', hour12: true })
 * @example generateTimeRange({
 * startTime: '08:00',
 * endTime: '17:00',
 * interval: '00:30',
 * startDate: new Date('2022-02-20')})
 * @example generateTimeRange({}) // default values:
 * startTime: 08:00, endTime: 17:00, interval: 00:30
 */
exports.generateTimeRange = ({
  startTime = TWENTY_FOUR_HOUR.START,
  endTime = TWENTY_FOUR_HOUR.END,
  startDate = null,
  endDate = null,
  interval = '00:30',
  locale = 'en-US',
  hour12 = true
}) => {
  const _startDate = dayjs(startDate);
  const start = _startDate.isValid() ? new Date(_startDate) : new Date();

  const [startHour, startMinute] = startTime.split(':');
  start.setHours(startHour, startMinute, 0, 0);

  const _endDate = dayjs(endDate);
  const end = _endDate.isValid() ? new Date(_endDate) : new Date();

  const [endHour, endMinute] = endTime.split(':');
  end.setHours(endHour, endMinute, 0, 0);

  if (start > end) {
    throw new Error('Start date cannot be greater than end date');
  }

  const times = [];
  const dateTimes = [];
  const dates = [];

  let [intervalHour, intervalMinute] = interval.split(':');
  intervalHour = Number.parseInt(intervalHour, 10);
  intervalMinute = Number.parseInt(intervalMinute, 10);

  if (intervalHour === 0 && intervalMinute === 0) {
    intervalMinute = 15;
  }

  const intervalInMinutes = (intervalHour * 60) + intervalMinute;

  // start date need to be less that end date,
  // "AND end - start need to be greater than 0,
  //  put in another way, end - start !== 0"
  while (start <= end) {
    const time = start.toLocaleString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12
    });
    times.push(time);

    const datetime = dayjs(start).format();
    dateTimes.push(datetime);

    const date = dayjs(datetime).format().split('T')[0];
    dates.push(date);

    start.setMinutes(start.getMinutes() + intervalInMinutes);
  }

  const noResult = !times.length && !dateTimes.length && !dates.length;

  // Given: startTime => 22:10, endTime => 22:24, interval => 00:15
  // generated times will be: 10:10 pm or 22:10, whose interval is not a complete cycle
  // we need not to return a single time range, but return nothing (null)
  const isLessThanInterval = times.length === 1;
  if (isLessThanInterval || noResult) {
    return null;
  }

  return { times, dates, datetime: dateTimes };
};

/**
   * @description this converts time(in hour) to minutes passed as hours and minutes
   * @param {string} time 09:00pm
   * @returns {number} minutes // example: 540
   */
exports.toMinute = (time) => {
  let timeSplit;

  // convert to 24 hour time so that 09:00pm => 22:00
  if (this.is12HourTime(time)) {
    timeSplit = this.cast12HourTimeTo24HourTime(time);
  }
  timeSplit = time.split(':');

  const _hour = Number.parseInt(timeSplit[0], 10);
  const _minute = Number.parseInt(timeSplit[1], 10);

  const hourMinutes = _hour * 60;
  const minutes = hourMinutes + _minute;

  return minutes;
};

/**
 * @description convert duration to minute, during are expressed in hours:minutes
 * @param {string} duration 02:45 , this means 2 hours 45 minutes
 *  15:00 means 15 hours, not 15 o'clock
 * @returns {number} minute example: 165
 */
exports.durationToMinute = (duration) => {
  const _duration = duration.split(':');

  const _hour = Number.parseInt(_duration[0], 10);
  const _minute = Number.parseInt(_duration[1], 10);

  const hourMinutes = _hour * 60;
  const minutes = hourMinutes + _minute;

  return minutes;
};

/**
 * @description add duration to a time string
 * @param {string} time time to add duration to, example 09:00am
 * @param {string} duration duration to add to time, example 02:45 means 2 hours 45 minutes
 * @returns {string} time with duration added, example 11:45am
 */
exports.addDurationToTime = (time, duration) => {
  const _time = this.cast12HourTimeTo24HourTime(time);
  const _duration = this.durationToMinute(duration);
  const newTime = dayjs()
    .set('hour', _time.slice(0, 2))
    .set('minute', _time.slice(3, 5))
    .add(_duration, 'minute');

  if (!newTime.isValid()) {
    throw new Error('DateTimeService.addDurationToTime(): Invalid time');
  }

  return newTime.format('hh:mm a').replaceAll(' ', '');
};

/**
   *@description this converts 12 hour time to 24 hour time
   * @param {string} time time in 12, example 03:00pm
   * @returns {string} time in 24, example 15:00
   */
exports.to24HourFormat = (time) => {
  const timeSplit = time.split(':');
  const NumberHour = Number.parseInt(timeSplit[0], 10);
  let hour = timeSplit[0];
  const minute = timeSplit[1].slice(0, 2);
  const ampm = timeSplit[1].slice(2);

  if (ampm === 'am' && NumberHour === 12) {
    hour = '00';
  } else if (ampm === 'pm' && NumberHour !== 12) {
    hour = NumberHour + 12;
  } else if (ampm === 'pm' && hour === 12) {
    hour = NumberHour;
  }

  return `${hour}:${minute}`;
};

/**
   * @description convert 12 hour time to 24 hour time
   * @param {string} time 12 hour time to convert to 24 hour format: 09:00pm
   * @returns {string} 24 hours time example 15:00
   */
exports.cast12HourTimeTo24HourTime = (time) => this.to24HourFormat(time);

exports.cast24HourTimeToMinute = (twentyFourHourTime) => {
  const minutes = this.toMinute(twentyFourHourTime);
  return minutes;
};

/**
   * @description this removes am/pm from time (12 o'clock time)
   * @param {string} time 09:00am
   * @returns {string} time 09:00
   */
exports.removeMeridianFromTime = (time) => time.slice(0, -2);

/**
   *
   * @param {string} time example 09:00
   * @returns {string} 09:00:am
   */
exports.addMeridianTo12HourTime = (time) => {
  const timeSplit = time.split(':');
  const hour = timeSplit[0];
  const minute = timeSplit[1];
  const ampm = hour >= 12 ? 'pm' : 'am';
  return `${hour}:${minute}${ampm}`;
};

/**
 * @description add space between hour:minute and am/pm
 * @param {string} time example 09:00pm
 * @returns {string} time 09:00 am
 */
exports.addSpaceBeforeMeridian = (time) => {
  const timeSplit = time.split(':');
  const hour = timeSplit[0];
  const minute = timeSplit[1].slice(0, 2);
  const ampm = hour >= 12 ? 'pm' : 'am';
  return `${hour}:${minute} ${ampm}`;
};

/**
   * @description pad hour and minute with 0 if it is less than 10
   * @param {string} time example if the time is like this 9:01pm or 02:1
   * @returns {string} 09:01pm or 02:01
   */
exports.normaliseTime = (time) => {
  const timeSplit = time.split(':');
  let hour = Number.parseInt(timeSplit[0], 10);

  hour = hour > 24 ? 24 : hour;
  hour = hour < 0 ? 0 : hour;
  hour = hour < 10 ? `0${hour}` : hour;

  let minute = timeSplit[1];

  if (this.is12HourTime(time)) {
    if (minute.length <= 3) { // likely it is like this: 1pm
      minute = `0${minute}`;
    }
    // may be it is in normal form like this: 01pm
  } else if (Number.parseInt(minute, 10) < 10) {
    minute = `0${Number.parseInt(minute, 10)}`;
  }

  return `${hour}:${minute}`;
};

/**
   *
   * @param {string} time 03:00am or 03:00pm
   * @returns true or false
   */
exports.is12HourTime = (time) => {
  const timeSplit = time.split(':');
  const hour = Number.parseInt(timeSplit[0], 10);

  const ampm = time.slice(time.length - 2);
  const hasAmPm = ampm === 'am' || ampm === 'pm';

  return hour <= 12 && hasAmPm;
};

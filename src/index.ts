import * as ical from 'node-ical';
import * as fs from 'fs';
import {classroom_v1, google} from 'googleapis';

import logger from "./simpleLogger";
import {authorize} from './googleClassroom'

const events = ical.sync.parseFile('joesharp-timetable.ics');

type CalendarLesson = {courseName: string, subject: string, event : ical.CalendarComponent}

const lessons: CalendarLesson[] = Object.values(events).map(event => {
    logger.info(`Summary: ${event.summary}`);
    // logger.info(`Start Date: ${event.start.toISOString()}`)

    const parts: string[] = (event.summary as string).split(' ');
    const courseName = parts[parts.length-1];
    const subject: string = parts.filter((_, i) => i < (parts.length-1)).join(' ');

    return {
      courseName,subject,
      event
    }
});

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
const courseNames: string[] = lessons.map(l => l.courseName).filter(onlyUnique);

function createLessons(classroom: classroom_v1.Classroom, courses: classroom_v1.Schema$Course[]) {
  logger.info('Courses:');
  courses.forEach((course) => {
    logger.info(`${course.name} (${course.id})`);
    const lessonsForCourse = lessons.filter(l => l.courseName === course.name).forEach(l => {
      classroom.courses.courseWork.create({
        courseId: course.id,
        requestBody: {
          title: (l.event.start as ical.DateWithTimeZone).toISOString(),
          workType: 'Assignment'
        }
      }, (err, res) => {
        if (err) return logger.error('The Create CourseWork API returned an error: ' + err);

        logger.info('CourseWork Created ' + res);

      })
    })

  });
}

function createCourses(classroom: classroom_v1.Classroom, courses: classroom_v1.Schema$Course[]) {
  courseNames.forEach(courseName => {
    if (!courses.find(c => c.name === courseName)) {
      logger.info(`Creating course with name ${courseName}`)
      const newCourse = {
        name: courseName,
        section: '2020/2021',
        ownerId: 'me',
        courseState: 'PROVISIONED'
    };
      classroom.courses.create({
        requestBody: newCourse
      }, (err, res) => {
        if (err) return logger.error('The Create Course API returned an error: ' + err);

        logger.info('Course Created ' + res);
      })
    }
  })

  // Refetch all courses
  classroom.courses.list({}, (err, res) => {
    if (err) return logger.error('The List Course API returned an error: ' + err);
    createLessons(classroom, res.data.courses);
  });
}

/**
 * Lists the first 10 courses the user has access to.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function fetchCourses(auth) {
    const classroom = google.classroom({version: 'v1', auth});

    classroom.courses.list({}, (err, res) => {
      if (err) return logger.error('The List Course API returned an error: ' + err);
      const courses = res.data.courses;
      if (courses && courses.length) {
        createCourses(classroom, courses);
      } else {
        logger.info('No courses found.');
      }
    });
  }

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return logger.info('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Classroom API.
    authorize(JSON.parse(content as unknown as string), fetchCourses);
  });
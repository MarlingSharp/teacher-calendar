import * as ical from 'node-ical';
import * as fs from 'fs';
import {google} from 'googleapis';

import logger from "./simpleLogger";
import {authorize} from './googleClassroom'

const events = ical.sync.parseFile('joesharp-timetable.ics');

Object.values(events).forEach(event => {
    logger.info(`Summary: ${event.summary}`);
    // logger.info(`Start Date: ${event.start.toISOString()}`)
});

/**
 * Lists the first 10 courses the user has access to.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listCourses(auth) {
    const classroom = google.classroom({version: 'v1', auth});
    classroom.courses.list({
      pageSize: 10,
    }, (err, res) => {
      if (err) return logger.error('The API returned an error: ' + err);
      const courses = res.data.courses;
      if (courses && courses.length) {
        logger.info('Courses:');
        courses.forEach((course) => {
          logger.info(`${course.name} (${course.id})`);
        });
      } else {
        logger.info('No courses found.');
      }
    });
  }

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return logger.info('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Classroom API.
    authorize(JSON.parse(content as unknown as string), listCourses);
  });
import * as winston from 'winston';

export default winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
      new winston.transports.Console(),
      // new winston.transports.File({ filename: 'logfile.log' })
    ]
  });

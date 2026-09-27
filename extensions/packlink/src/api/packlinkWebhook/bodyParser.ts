import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.json({ limit: '64kb' })(request, response, next);
};

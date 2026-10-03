import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.json({ inflate: false, limit: '2kb' })(request, response, next);
};

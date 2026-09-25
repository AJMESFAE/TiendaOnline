import bodyParser from 'body-parser';

// Redsys envía la notificación online como application/x-www-form-urlencoded.
export default (request, response, next) => {
  bodyParser.urlencoded({ extended: false, limit: '64kb' })(
    request,
    response,
    next
  );
};

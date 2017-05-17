const validatorBuilder = require('./validator-builder');
const IntegerType = require('./validators/integer').Type;
const any = require('./any');


class PerfectSchema {

  /**
  Create a new instance of PerfectSchema

  @param fields {Object}
  */
  constructor(fields) {
    if (typeof fields !== 'object') { throw new TypeError('Fields must be an object'); }

    this._fieldNames = Object.keys(fields);
    this._fields = fields;
    this._validators = validatorBuilder(fields);
  }


  /**
  Extends the current schema with more fields

  @param fields {Object}
  */
  extends(fields) {
    const fieldNames = Object.keys(fields);

    for (var fieldName of fieldNames) {
      fields[fieldName] = this._fields[fieldName] = Object.assign(this._fields[fieldName] || {}, fields[fieldName]);
    }

    this._validators = Object.assign(this._validators || {}, validatorBuilder(fields));
  }


  /**
  Validate the given data

  @param data {Object}    the data to Validate
  @return {ValidationResult}
  */
  validate(data) {
    const dataFields = Object.keys(data || {});
    const fields = this._fields;
    const fieldNames = this._fieldNames;
    const validators = this._validators;
    const messages = [];
    var done = false;

    const promise = new Promise((resolve, reject) => {
      const validationResults = [];

      function validateField(fieldName, value) {
        const validator = validators[fieldName];

        return Promise.resolve(validator(value)).then(message => {
          if (message) {
            messages.push({ fieldName: fieldName, message: message, value: value });
          }
        });
      }

      for (var fieldName of dataFields) {
        if (!(fieldName in fields)) {
          return 'keyNotInSchema';
        }
      }

      for (var fieldName of fieldNames) {
       validationResults.push(validateField(fieldName, data[fieldName]));
     }

      return Promise.all(validationResults);
    }).then(() => {
      done = true;
      return messages;
    });

    return {
      isDone() {
        return done;
      },
      isValid() {
        return done ? !errors.length : false;
      },
      errorMessages() {
        return messages;
      },
      validationPromise() {
        return promise;
      }
    };
  }

}

PerfectSchema.any = any;
PerfectSchema.Integer = IntegerType;



module.export = PerfectSchema;

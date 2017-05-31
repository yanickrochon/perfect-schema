const validators = require('./validators');
const PerfectSchema = require('./schema');

const isSchema = PerfectSchema.isSchema;
const isType = validators.isType;


function normalizeFields(fields) {
  const fieldNames = Object.keys(fields || {});
  var specs;

  for (var fieldName of fieldNames) {
    specs = fields[fieldName];

    if (Array.isArray(specs)) {
      fields[fieldName] = { type: [validators.getType(specs[0])] };
    } else if (isType(specs) || isSchema(specs)) {
      fields[fieldName] = { type: validators.getType(specs) };
    } else if ('type' in specs) {
      if (Array.isArray(specs.type)) {
        specs.type = [validators.getType(specs.type[0])];
      } else {
        specs.type = validators.getType(specs.type);
      }
    }
  }

  return fields;
};


module.exports = normalizeFields;

import varValidator from 'var-validator';

import ValidationContext from './context';
import { createModel } from './model';

import types, { anyType, anyOfType, arrayOfType, integerType } from './types/types';


// field validator config
varValidator.enableScope = false;
varValidator.enableBrackets = false;

// schema id counter
let schemaCount = 0;



class PerfectSchema {

  /**
  Add a plugin to use with new instances of PerfectSchema. Added
  plugins do not affect currently instanciated instances.

  @param plugin {Function} a single function receiving the instance
  */
  static use(pluginFactory) {
    const plugin = pluginFactory(PerfectSchema)

    if (plugin) {
      if (typeof plugin === 'function') {
        PerfectSchema._plugins.push({
          init: plugin
        });
      } else {
        PerfectSchema._plugins.push(plugin);
      }
    }

    return PerfectSchema;
  }

  /**
  Create a new instance

  @param fields {Object} the fields definition (will be sanitized and normalized)
  @params options {Object} the schema options
  */
  constructor(fields, options = {}) {
    if (!fields || !Object.keys(fields).length) {
      throw new TypeError('No defined fields');
    } else if (typeof fields !== 'object') {
      throw new TypeError('Invalid fields argument');
    }

    PerfectSchema._plugins.forEach(plugin => plugin.preInit && plugin.preInit(this, fields, options));

    Object.defineProperties(this, {
      options: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: options
      },
      fields: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: normalizeValidators(fields, this)
      },
      fieldNames: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: Object.keys(fields)
      },
      _type: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: createType(this)
      },
      _namedContexts: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: {}
      }
    });

    PerfectSchema._plugins.forEach(plugin => plugin.init && plugin.init(this));

    this.fieldNames.forEach(field => Object.freeze(this.fields[field]));

    Object.freeze(this.fields);     // no further mods!
    Object.freeze(this.fieldNames); //
  }

  /**
  Create a new empty model from the fields' default values specification

  @return {Object}
  */
  createModel(data) {
    const model = createModel(this, data);

    PerfectSchema._plugins.forEach(plugin => plugin.extendModel && plugin.extendModel(model, this));

    return model;
  }

  /**
  Create a new validation context based on this schema

  @param name {String}   (optional) return a shared context identified by name
  */
  createContext(name) {
    const newContext = !name || !this._namedContexts[name];
    const context = newContext ? new ValidationContext(this) : this._namedContexts[name];

    if (newContext) {
      PerfectSchema._plugins.forEach(plugin => plugin.extendContext && plugin.extendContext(context, this));

      if (name) {
        this._namedContexts[name] = context;
      }
    }

    return context;
  }

}


// Bind default standard types
PerfectSchema.Any = anyType;
PerfectSchema.AnyOf = (...allowedTypes) => anyOfType(...allowedTypes.map(type => types.isPrimitive(type) || types.isType(type) || (type instanceof PerfectSchema) ? type : new PerfectSchema(type)));
PerfectSchema.ArrayOf = baseType => arrayOfType(types.isPrimitive(baseType) || types.isType(baseType) || (baseType instanceof PerfectSchema) ? baseType : new PerfectSchema(baseType));
PerfectSchema.Integer = integerType;


// internal properties
Object.defineProperties(PerfectSchema, {
  _plugins: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: []
  },
  _normalizeField: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: normalizeField
  }
});

Object.defineProperties(PerfectSchema.prototype, {
  _normalizeField: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: normalizeField
  }
});



/**
Create a type for the given schema

@param schemaType {PerfectSchema}
@return {type}
*/
function createType(schemaType) {
  return {
    $$type: Symbol('schema' + (++schemaCount)),
    validatorFactory: (fieldName, field, schema, wrappedValidator) => {
      const {
        required = false,
        nullable = true
      } = field;
      const validatorContext = schemaType.createContext();

      function validator(value, options, context) {
        if (value === undefined) {
          return required ? 'required' : undefined;
        } else if (value === null) {
          return !nullable ? 'isNull' : undefined;
        } else {

          try {
            if (!validatorContext.validate(value)) {
              if (fieldName) {
                const contextMessages = validatorContext.getMessages();

                Object.keys(contextMessages).forEach(subFieldName => context.setMessage(fieldName + '.' + subFieldName, contextMessages[subFieldName]));
              }

              return 'invalid';
            }
          } catch (e) {
            return 'invalidType';
          }
        }

        return wrappedValidator && wrappedValidator(value, options, context);
      }

      validator.context = validatorContext;

      return validator;
    }
  };
}


/**
Sanitize all fields from the given object, make sure that each
key is a valid name, and that each type if a recognized validator

@param fields {object}
@param schema {PerfectSchema}
@return {Object}
*/
function normalizeValidators(fields, schema) {
  const fieldNames = Object.keys(fields);

  for (const fieldName of fieldNames) {
    if (!varValidator.isValid(fieldName)) {
      throw new Error('Invalid field name : ' + fieldName);
    }

    const field = fields[fieldName] = normalizeField(fields[fieldName], fieldName);

    field.validator = field.type.validatorFactory(fieldName, field, schema, field.validator);
  }

  return fields;
}


/**
Return an object that is normalized with a valid type property

@param field
@param fieldName {String}   (optional) the field name
@return {Object}
*/
function normalizeField(field, fieldName) {
  if (!field) {
    throw new TypeError('Empty field specification' + (fieldName ? (' for ' + fieldName) : ''));
  } else if (!field.type) {
    field = { type: field };
  }

  if (field.type instanceof PerfectSchema) {
    field.type = field.type._type;
  } else if (!types.isType(field.type)) {
    field.type = types.getType(field.type);
  }

  if (!field.type) {
    throw new TypeError('Invalid field specification' + (fieldName ? (' for ' + fieldName) : ''));
  }

  return field;
}



export default PerfectSchema;

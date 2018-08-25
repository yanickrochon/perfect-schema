import assert from 'assert';
import PerfectSchema from '../src/schema';


describe('Testing integration', () => {


  it('should create and validate simple schema', () => {

    const itemSchema = new PerfectSchema({
      _id: String,
      name: {
        type: String,
        required: true,
        min: 3
      },
      qty: {
        type: Number,
        defaultValue: 0
      },
      price: Number,
      data: PerfectSchema.Any
    });

    const cartSchema = new PerfectSchema({
      items: PerfectSchema.ArrayOf(itemSchema)
    });


    const item = itemSchema.createModel({
      name: 'foo',
      data: { prop: 'value' }
    });
    const itemContext = itemSchema.createContext();

    const cart = cartSchema.createModel({
      items: [item]
    });
    const cartContext = cartSchema.createContext();


    assert.deepStrictEqual(item, { name: 'foo', qty: 0, data: { prop: 'value' } });
    itemContext.validate(item);
    assert.ok( itemContext.isValid() );

    item.data = true;   // set data to a different type

    assert.deepStrictEqual(item, { name: 'foo', qty: 0, data: true });
    itemContext.validate(item);
    assert.ok( itemContext.isValid() );

    item.qty = /123/;

    assert.deepStrictEqual(item, { name: 'foo', qty: /123/, data: true });
    itemContext.validate(item);
    assert.ok( !itemContext.isValid() );


    assert.ok( cartContext.isValid() );
    cartContext.validate(cart);
    assert.ok( !cartContext.isValid() );
    assert.deepStrictEqual(cartContext.getMessages(), { 'items.0.qty': 'invalidType', 'items': 'invalid' });

    item.qty = 2;

    cartContext.validate(cart);
    assert.ok( cartContext.isValid() );
    assert.deepStrictEqual(cartContext.getMessages(), {});
  });


  it('should recursively back propagate error messages', () => {
    const c = new PerfectSchema({ c: String });
    const b = new PerfectSchema({ b: c });
    const a = new PerfectSchema({ a: b });

    const ctx = a.createContext();

    ctx.validate({ a: { b: { c: true }}});
    assert.deepStrictEqual( ctx.getMessages(), {
      'a': 'invalid',
      'a.b': 'invalid',
      'a.b.c': 'invalidType'
    } );
    assert.ok( !ctx.isValid() );

    ctx.validate({ a: { b: { c: 'ok' }}});
    assert.deepStrictEqual( ctx.getMessages(), {} );
    assert.ok( ctx.isValid() );

    ctx.validate({ a: { b: true }});
    assert.deepStrictEqual( ctx.getMessages(), {
      'a': 'invalid',
      'a.b': 'invalidType',
    } );
    assert.ok( !ctx.isValid() );

    ctx.validate({ a: true });
    assert.deepStrictEqual( ctx.getMessages(), {
      'a': 'invalidType'
    } );
    assert.ok( !ctx.isValid() );

  });


});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function formHarness(overrides = {}) {
  const values = { name: 'Test & Visitor', phone: '9876543210', preferred_date: '2099-01-01', preferred_time: '11:00', treatment: 'Braces', message: 'Question? A&B #1', ...overrides };
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {
    id, value, addEventListener() {}, setAttribute() {}, getAttribute() { return ''; }, removeAttribute() {}, focus() {},
  }]));
  let submit;
  let destination;
  const button = { disabled: true };
  const status = { textContent: '' };
  const form = {
    elements: { namedItem: (id) => elements[id] },
    querySelector: () => button,
    checkValidity: () => true,
    addEventListener: (event, handler) => { if (event === 'submit') submit = handler; },
  };
  const document = {
    querySelector: (selector) => selector === '#appointment' ? form : selector === '#form-status' ? status : null,
    querySelectorAll: () => [],
    getElementById: () => ({ textContent: '' }),
  };
  const window = { matchMedia: () => ({ matches: true }), location: { assign: (url) => { destination = url; } } };
  vm.runInNewContext(fs.readFileSync('static/js/main.js', 'utf8'), {
    document, window, FormData: class { get(key) { return values[key]; } },
  });
  return { button, status, submit: () => submit({ preventDefault() {} }), destination: () => destination };
}

test('submission encodes every field for the fixed clinic WhatsApp number', () => {
  const form = formHarness();
  assert.equal(form.button.disabled, false);
  form.submit();
  const url = new URL(form.destination());
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/919437245564');
  assert.equal([...url.searchParams.keys()].join(','), 'text');
  const message = url.searchParams.get('text');
  for (const field of ['Test & Visitor', '9876543210', '2099-01-01', '11:00', 'Braces', 'Question? A&B #1']) assert.ok(message.includes(field));
  assert.match(form.status.textContent, /tap Send/);
});

test('invalid phone, past date and closed hours do not open WhatsApp', () => {
  for (const invalid of [{ phone: '123' }, { preferred_date: '2000-01-01' }, { preferred_time: '09:00' }, { name: '' }, { treatment: '' }]) {
    const form = formHarness(invalid);
    form.submit();
    assert.equal(form.destination(), undefined);
  }
});

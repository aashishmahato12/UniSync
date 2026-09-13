// n8n Code node: Run Once for All Items. This runs after notices are saved,
// so the foreign key exists before event rows are inserted.
return $('Validate Extraction').all().flatMap(item => item.json.events.map(event => ({ json: event })));

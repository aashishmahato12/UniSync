const source = $('Prepare Receipt Email').first().json;
const item = $input.item;
if (!item.binary?.data) throw new Error('Receipt attachment download returned no file.');
item.binary.data.fileName = source.receiptName;
return { json: source, binary: item.binary };


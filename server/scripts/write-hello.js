require('fs').writeFileSync('hello.txt', 'hello at ' + new Date().toISOString());
process.exit(0);

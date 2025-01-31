const app = require("./app");
const port = process.env.PORT;

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
console.log(process.env);

# JavaScript compiler API

an Javascript compiler API using node:vm module.

## Installation

Clone the repository:
```bash
git clone https://github.com/AtilMohAmine/JS-compiler-API.git
```
Install the dependencies
```bash
cd JS-compiler-API
npm install
```

## Running the app

```bash
npm start
```
Browse to http://localhost:3000/.

## API calls examples:

|    Endpoint     | Methode |                         Params                             |                                 Response                                    |
| --------------- | ------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| /api/v1/comiler |   GET   | { code: "console.log('Hello World');console.log('Wow');" } | {"state":"Success","output":["Hello World","Wow"]}                          |
| /api/v1/comiler |   GET   |  none                                                      | {"state":"Missing required parameter","error":"Code parameter is required"} |
| /api/v1/comiler |   GET   | { code: "blabla" }                                         | {"state":"Failed","error":"blabla is not defined at line 1"}                |

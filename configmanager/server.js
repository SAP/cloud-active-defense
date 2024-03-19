const express = require('express');
const app = express();
const fs = require('fs');

// Define a GET route that accepts a namespace and application parameter
app.get('/:namespace/:application', (req, res) => {
  const { namespace, application } = req.params;
  const filePath = `/data/cad-${namespace}-${application}.json`;
  const defaultFilePath = `/data/cad-default.json`;

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the file does not exist, try to return the default config file
      fs.access(defaultFilePath, fs.constants.F_OK, (err) => {
        if (err) {
          // If the default file does not exist, return an empty JSON object
          res.json({});
        } else {
          // If the file exists, read its contents and return as JSON object
          fs.readFile(defaultFilePath, 'utf8', (err, data) => {
            if (err) throw err;
            const json = JSON.parse(data);
            res.json(json);
          });
        }
      });
    } else {
      // If the file exists, read its contents and return as JSON object
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data);
        res.json(json);
      });
    }
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Config manager started');
});

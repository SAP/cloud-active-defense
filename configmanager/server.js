const express = require('express');
const app = express();
const fs = require('fs');
const hsts = require('hsts')
const path = require('path')

app.use(hsts({
  maxAge: 31536000,
  includeSubDomains: true
}))

// Define a GET route that accepts a namespace and application parameter
app.get('/:namespace/:application', (req, res) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "script-src 'self'");
  const { namespace, application } = req.params;
  const filePath = path.resolve(path.normalize(`${__dirname}/data/cad-${namespace}-${application}.json`).replace(/^(\.\.(\/|\\|$))+/, ''));
  const defaultFilePath = `/data/cad-default.json`;
  const sessionFilePath = `/data/session-default.json`;
  if(!filePath.startsWith(__dirname)){
    return res.end()
  }
  
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
          fs.readFile(defaultFilePath, 'utf8', (err, decoys) => {
            if (err) {
              console.warn("Default decoy config file is missing !");
              return res.json([]);
            }
            if(!decoys) return res.json([])
            const decoysJson = JSON.parse(decoys);
            // Check if the file exists
            fs.access(sessionFilePath, fs.constants.F_OK, err => {
              if(err) return res.json({ decoys: decoysJson });

              // If the file exists, read its contents and return as JSON object
              fs.readFile(sessionFilePath, 'utf8', (err, session) => {
                if(err) return res.json({ decoys: decoysJson });
                if (session) {
                  const sessionJson = JSON.parse(session);
                  return res.json({ decoy: decoysJson, session: sessionJson });
                }
                return res.json({ decoy: decoysJson })
              })
            })
          });
        }
      });
    } else {
      // If the file exists, read its contents and return as JSON object
      fs.readFile(filePath, 'utf8', (err, decoys) => {
        if (err) {
          console.warn("Decoy config file is missing !");
          return res.json([]);
        }
        if(!decoys) return res.json([])
        const decoysJson = JSON.parse(decoys);
        // Check if the file exists
        fs.access(sessionFilePath, fs.constants.F_OK, err => {
          if(err) return res.json({ decoys: decoysJson });
          
          // If the file exists, read its contents and return as JSON object
          fs.readFile(sessionFilePath, 'utf8', (err, session) => {
            if(err) return res.json({ decoys: decoysJson });
            if (session) {
              const sessionJson = JSON.parse(session);
              return res.json({ decoy: decoysJson, session: sessionJson });
            }
            return res.json({ decoy: decoysJson })
          })
        })
      });
    }
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Config manager started');
});

const express = require('express');
const app = express();
const fs = require('fs');
const hsts = require('hsts')
const path = require('path')

app.use(hsts({
  maxAge: 31536000,
  includeSubDomains: true
}))
app.use(express.json())

// Define a GET route that accepts a namespace and application parameter
app.get('/:namespace/:application', (req, res) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "script-src 'self'");
  const { namespace, application } = req.params;
  var filePath = '', configFilePath = ''
  if (!namespace.match(/^[a-zA-Z0-9-]+$/) || !application.match(/^[a-zA-Z0-9-]+$/)) {
    console.warn(`Bad path provided for decoys config file: ${filePath}, ${configFilePath}`);
  } else {
    filePath = path.resolve(`/data/cad-${namespace}-${application}.json`);
    configFilePath = path.resolve(`/data/config-${namespace}-${application}.json`);
  }
  const defaultFilePath = `/data/cad-default.json`;
  const defaultConfigFilePath = `/data/config-default.json`;
  
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
            var decoysJson;
            try {
              decoysJson = JSON.parse(decoys);
            } catch(e){
              console.error("File cad-default.json is not a valid json");
              return res.json([]);
            }
            // Check if the file exists
            fs.access(configFilePath, fs.constants.F_OK, err => {
              if(err) {
                fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
                  if (err) { return res.json({ decoy: decoysJson }) }
                  fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                    if(err) return res.json({ decoy: decoysJson });
                    if (config) {
                      try {
                        const configJson = JSON.parse(config);
                        return res.json({ decoy: decoysJson, config: configJson });
                      } catch(e){
                        console.error("File config-default.json is not a valid json");
                        return res.json([]);
                      }
                    }
                    return res.json({ decoy: decoysJson })
                  })
                })
              } else {
                fs.readFile(configFilePath, 'utf8', (err, config) => {
                  if(err) return res.json({ decoy: decoysJson });
                  if (config) {
                    try{
                      const configJson = JSON.parse(config);
                      return res.json({ decoy: decoysJson, config: configJson });
                    } catch(e){
                      console.error(`File config-${namespace}-${application}.json is not a valid json`);
                      return res.json([]);
                    }
                  }
                  return res.json({ decoy: decoysJson })
                })
              }
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
        var decoysJson;
        try{
          decoysJson = JSON.parse(decoys);
        } catch(e){
          console.error(`File cad-${namespace}-${application}.json is not a valid json`);
          return res.json([]);
        }
        // Check if the file exists
        fs.access(configFilePath, fs.constants.F_OK, err => {
          if(err) {
            fs.access(defaultConfigFilePath, fs.constants.F_OK, err => {
              if (err) { return res.json({ decoy: decoysJson }) }
              fs.readFile(defaultConfigFilePath, 'utf8', (err, config) => {
                if(err) return res.json({ decoy: decoysJson });
                if (config) {
                  try{
                    const configJson = JSON.parse(config);
                    return res.json({ decoy: decoysJson, config: configJson });
                  } catch(e){
                    console.log("File config-default.json is not a valid json");
                    return res.json([]);
                  }
                }
                return res.json({ decoy: decoysJson })
              })
            })
          } else {
            fs.readFile(configFilePath, 'utf8', (err, config) => {
              if(err) return res.json({ decoy: decoysJson });
              if (config) {
                try{
                  const configJson = JSON.parse(config);
                  return res.json({ decoy: decoysJson, config: configJson });
                } catch(e){
                  console.error(`File config-${namespace}-${application}.json is not a valid json`);
                  return res.json([]);
                }
              }
              return res.json({ decoy: decoysJson })
            })
          }
        })
      });
    }
  });
});

app.get('/blocklist', (req, res) => {
  fs.access("/data/blocklist/blocklist.json", fs.constants.F_OK, err => {
    if (err) {
      fs.writeFileSync("/data/blocklist/blocklist.json", `{"list":[]}`, 'utf8')
      return res.json({list: []})
    }
    const blocklist = JSON.parse(fs.readFileSync("/data/blocklist/blocklist.json", 'utf8'))
    i = 0
    for (const elem of blocklist.list) {
      if (elem.Duration == 'forever') continue
      const unbanDate = new Date(elem.Time * 1000)
      switch (elem.Duration[elem.Duration.length-1]) {
        case 's':
          unbanDate.setSeconds(unbanDate.getSeconds() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'm':
          unbanDate.setMinutes(unbanDate.getMinutes() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'h':
          unbanDate.setHours(unbanDate.getHours() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
      }
      if (new Date() >= unbanDate){
        blocklist.list.splice(i, 1)
      }
      i++
    }
    fs.writeFileSync("/data/blocklist/blocklist.json", JSON.stringify(blocklist))
    return res.json(blocklist)
  })
})

app.post('/blocklist', (req, res) => {
  var error;
  fs.access("/data/blocklist/blocklist.json", fs.constants.F_OK, err => {
    if (err) error = err
    const blocklistFile = JSON.parse(fs.readFileSync("/data/blocklist/blocklist.json", 'utf8'))
    blocklistFile.list.push(...req.body.blocklist)
    fs.writeFileSync("/data/blocklist/blocklist.json", JSON.stringify(blocklistFile))
  })
  fs.access("/data/blocklist/throttlelist.json", fs.constants.F_OK, err => {
    if (err) error = err
    const throttlelistFile = JSON.parse(fs.readFileSync("/data/blocklist/throttlelist.json", 'utf8'))
    throttlelistFile.list.push(...req.body.throttle)
    fs.writeFileSync("/data/blocklist/throttlelist.json", JSON.stringify(throttlelistFile))
  })
  if (error) return res.send(error)
  return res.send("Done")
})

app.get('/throttlelist', (req, res) => {
  fs.access("/data/blocklist/throttlelist.json", fs.constants.F_OK, err => {
    if (err) {
      fs.writeFileSync("/data/blocklist/throttlelist.json", `{"list":[]}`, 'utf8')
      return res.json({list: []})
    }
    const throttlelist = JSON.parse(fs.readFileSync("/data/blocklist/throttlelist.json", 'utf8'))
    i = 0
    for (const elem of throttlelist.list) {
      if (elem.Duration == 'forever') continue
      const unbanDate = new Date(elem.Time * 1000)
      switch (elem.Duration[elem.Duration.length-1]) {
        case 's':
          unbanDate.setSeconds(unbanDate.getSeconds() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'm':
          unbanDate.setMinutes(unbanDate.getMinutes() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
        case 'h':
          unbanDate.setHours(unbanDate.getHours() + parseInt(elem.Duration.substring(0, elem.Duration.length-1)))
          break;
      }
      if (new Date() >= unbanDate){
        throttlelist.list.splice(i, 1)
      }
      i++
    }
    fs.writeFileSync("/data/blocklist/throttlelist.json", JSON.stringify(throttlelist))
    return res.json(throttlelist)
  })
})
// Start the server
app.listen(3000, () => {
  if (!fs.existsSync("/data/blocklist/blocklist.json")) fs.writeFileSync("/data/blocklist/blocklist.json", `{"list":[]}`, 'utf8')
  if (!fs.existsSync("/data/blocklist/throttlelist.json")) fs.writeFileSync("/data/blocklist/throttlelist.json", `{"list":[]}`, 'utf8')
  console.log('Config manager started');
});

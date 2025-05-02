var JZZ = require('jzz');
var fs = require('fs');
const { parseArgs } = require('node:util');
let map = new Array(64).fill(0);
const options = {
   interface: {
      type: 'string',
      short: 'i'
   },
   filePath: {
      type: 'string',
      short: 'f'
   },
   tempo: {
      type: 'string',
      short: 't'
   },
}

const { values } = parseArgs({ args: process.argv.slice(2), options });
let fileBytes = null;

JZZ().and(function () {
   const info = this.info();
   console.log('MIDI Inputs:');
   info.inputs.forEach((input, index) => {
       console.log(`${index + 1}: ${input.name}`);
   });
 
   console.log('\nMIDI Outputs:');
   info.outputs.forEach((output, index) => {
       console.log(`${index + 1}: ${output.name}`);
   });
});

if (fs.existsSync(values.filePath)) {
   fileBytes = fs.readFileSync(values.filePath);
} else {
   console.log('File not found');
   process.exit(1);
}

console.log('File size:', fileBytes.length);

port = JZZ().openMidiOut(values.interface);
if (!port) {
   console.log('Port not found');
   process.exit(1);
}

tempo = parseInt(values.tempo);
if (isNaN(tempo) || tempo <= 0) {
   console.log('Invalid tempo');
   process.exit(1);
}

console.log('Tempo:', tempo);
let counter = 0;

const tempoInterval = 60000 / (bpm * 24); 
setInterval(() => {
   port.send([0xF8]); // MIDI Clock message
 }, tempoInterval);
 
function play(){
   return new Promise((resolve) => {
      setInterval(() => {
         let byte = fileBytes[counter ++ % fileBytes.length];
         const idx = byte % 64;
         if (map[idx] === 0) {
            map[idx] = 1;
            console.log('Note on', idx + 36);
            port.noteOn(1, idx + 36).then(resolve);
         } else {
            map[idx] = 0;
            console.log('Note off', idx + 36);
            port.noteOff(1, idx + 36).then(resolve);
         }
      }, (60 * 1000) / tempo / 8 );
   });
}
play();
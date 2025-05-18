var JZZ = require('jzz');
var fs = require('fs');
const { parseArgs } = require('node:util');
let map = new Array(64).fill(0);
const CHANNEL = 1;

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
   gates: {
      type: 'boolean',
      short: 'g',
      default: false
   }
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
   fileBytes = Array.from(fs.readFileSync(values.filePath));
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

const tempoInterval = 60000 / (tempo * 24); 
setInterval(() => {
   port.send([0xF8]); // MIDI Clock message
 }, tempoInterval);

 // turn off all notes
port.allNotesOff(CHANNEL);

function play(lineNum, lineLength, repeats){
   return new Promise((resolve) => {
      let map = new Array(8).fill(0);
      let lineArray = fileBytes.splice(0, lineLength);
      counter = 0;
      setInterval(() => {
         let byte = lineArray[counter ++ % lineArray.length];
         const idx = byte % 8;

         if (counter == repeats){
            map = new Array(8).fill(0);
            lineArray = fileBytes.splice(0, lineLength);
         }

         if (values.gates) {
            if (map[idx] === 0) {
               map[idx] = 1;
               console.log('Gate on', (lineNum * 8) + idx + 36);
               port.noteOn(CHANNEL, idx + 36)
            } else {
               map[idx] = 0;
               console.log('Gate off', (lineNum * 8) + idx + 36);
               port.noteOff(CHANNEL, idx + 36)
            }
         } else{
            console.log('Trigger', (lineNum * 8) + idx + 36);
            port.noteOn(CHANNEL, (lineNum * 8) +idx + 36)
            .wait((((60 * 1000) / tempo) / 4) * byte)
            .noteOff(CHANNEL, (lineNum * 8) + idx + 36)
         }
      }, (60 * 1000) / tempo / 16 );
   });
}

const lineLengths = [12, 28, 24, 20, 44, 52, 16, 36]

for (let i = 0; i < 8; i++){
   play(i, lineLengths[i], i * 6);
}
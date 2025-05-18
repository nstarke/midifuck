var JZZ = require('jzz');
var fs = require('fs');
const { parseArgs } = require('node:util');
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
      let lineArray = fileBytes.splice(0, lineLength);
      let map = new Array(8).fill(0);
      counter = 0;
      setInterval(() => {
         console.log(lineNum, lineLength, repeats); 
         let byte = lineArray[counter ++ % lineArray.length];
         let midiNote = (lineNum * 8) + (byte % 8) + 36;

         if (counter % repeats == 0){
            lineArray = fileBytes.splice(0, lineLength);
            map = new Array(8).fill(0);
            console.log('New Line', lineNum);
         }

         if (values.gates) {
            if (map[byte % 8] === 0) {
               map[byte % 8] = 1;
               console.log('Gate on', midiNote);
               port.noteOn(CHANNEL, midiNote)
            } else {
               map[byte % 8] = 0;
               console.log('Gate off', midiNote);
               port.noteOff(CHANNEL, midiNote);
            }
         } else{
            console.log('Trigger', midiNote);
            port.noteOn(CHANNEL, midiNote)
            .wait((((60 * 1000) / tempo) / 4) * byte)
            .noteOff(CHANNEL, midiNote)
         }
      }, (60 * 1000) / tempo / 4 );
   });
}

const lineLengths = [12, 28, 24, 20, 44, 52, 16, 36]

let players = [];
for (let i = 0; i < 8; i++){
   players.push(play(i, lineLengths[i], i * 6));
}

Promise.all(players);
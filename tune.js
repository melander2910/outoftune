const video = document.getElementById("video");

// 
let audioCtx;
let analyser;
let scriptProcessor;
let microphone;
let stream;

// 

// get data from the users microphone
// get video data
function getUserDevice() {
    navigator.mediaDevices.getUserMedia({
        audio: true, // access the microphone
        // video: true,          // access webcam
    }).then(stream => {
        // video.srcObject = stream;

        // in order to work with everything else in the web audio api
        audioCtx = new AudioContext();

        // allows processing and analyzing of audio
        analyser = audioCtx.createAnalyser();
        scriptProcessor = audioCtx.createScriptProcessor(8192, 1, 1)

        // this does the same as below
        // audioCtx.createMediaStreamSource(stream).connect(analyser);
        microphone = audioCtx.createMediaStreamSource(stream); // create an object so the audio can be analysed, played and manipulated
        microphone.connect(analyser);

        // In order to not record everything all the time
        let sampleLengthMS = 100;
	    let recording = true;


        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);


        scriptProcessor.addEventListener("audioprocess", (event) => {

            // will hold timeseries data from the microhpone
            let buffer = [];

            if(!recording){
                return;
            }

            // fill the array with microphone channel data (PCM / Pulse-code modulation is the standard form of digital audio in computers)
            buffer = buffer.concat(Array.prototype.slice.call(event.inputBuffer.getChannelData(0)));
            
            //console.log(buffer);
            // console.log(sampleLengthMS * audioCtx.sampleRate / 1000);
            if(buffer.length > sampleLengthMS * audioCtx.sampleRate / 1000){
                recording = false;
                

            // Bergknoff PCM -> Frequency
            var amp = compute_correlations(buffer, test_frequencies, audioCtx.sampleRate);
            interpret_correlation_result(buffer, amp);

            buffer = [];

            // How long to wait before capturing audio again
            setTimeout(() => { recording = true; }, 250);

            }

            // there is a static that produces microphone data. With this i only logs the data when sound is produced.
            // if (buffer[1] > 0.01) {
            //     // console.log("This is microphone data: " + buffer); 
            // }

            // // reset data
            // buffer = [];

            

        })
    }).catch(console.error)
}

window.addEventListener("load", getUserDevice, false)


// Interpretation of PCM DATA - Jonathan Bergknoff
var C2 = 65.41; // C2 note, in Hz.
var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var test_frequencies = [];
for (var i = 0; i < 30; i++) {
    var note_frequency = C2 * Math.pow(2, i / 12);
    var note_name = notes[i % 12];
    var note = {
        "frequency": note_frequency,
        "name": note_name
    };
    var just_above = {
        "frequency": note_frequency * Math.pow(2, 1 / 48),
        "name": note_name + " (a bit sharp)"
    };
    var just_below = {
        "frequency": note_frequency * Math.pow(2, -1 / 48),
        "name": note_name + " (a bit flat)"
    };
    test_frequencies = test_frequencies.concat([just_below, note, just_above]);
    
}
console.log(test_frequencies);
function compute_correlations(timeseries, test_frequencies, sample_rate) {
    // 2pi * frequency gives the appropriate period to sine.
    // timeseries index / sample_rate gives the appropriate time coordinate.
    var scale_factor = 2 * Math.PI / sample_rate;
    var amplitudes = test_frequencies.map(
        function (f) {
            var frequency = f.frequency;

            // Represent a complex number as a length-2 array [ real, imaginary ].
            // FFT - FAST FURIOR TRANSFORMER
            var accumulator = [0, 0];
            for (var t = 0; t < timeseries.length; t++) {
                accumulator[0] += timeseries[t] * Math.cos(scale_factor * frequency * t);
                accumulator[1] += timeseries[t] * Math.sin(scale_factor * frequency * t);
            }

            return accumulator;
        }
    );

    return amplitudes;
}

function interpret_correlation_result(time, amp) {
    var frequency_amplitudes = amp;
    var magnitudes = frequency_amplitudes.map(function (z) {
        return z[0] * z[0] + z[1] * z[1];
    });

    // Find the maximum in the list of magnitudes.
    var maximum_index = -1;
    var maximum_magnitude = 0;
    for (var i = 0; i < magnitudes.length; i++) {
        if (magnitudes[i] <= maximum_magnitude)
            continue;

        maximum_index = i;
        maximum_magnitude = magnitudes[i];
    }

    var average = magnitudes.reduce(function (a, b) {
        return a + b;
    }, 0) / magnitudes.length;
    var confidence_threshold = 10; // empirical, arbitrary.

    if (average > confidence_threshold) {
        var dominant_frequency = test_frequencies[maximum_index];
        //console.log(dominant_frequency.name);
        console.log(dominant_frequency);
        document.getElementById("noteName").textContent = dominant_frequency.name;
        document.getElementById("frequency").textContent = "Frequenzy (Hz): " + (Math.round(dominant_frequency.frequency * 100) / 100).toFixed(3);
    }
}


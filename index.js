const express = require('express');

// const Tesseract = require('node-tesseract-ocr');
const Tesseract = require('tesseract.js');
const multer = require('multer');
const fs = require('fs');

const path = require('path')

const app = express();

const port = 8000;

app.use(express.static(path.join(__dirname + '/uploads')));

app.set('view engine', "ejs")

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + "-" + Date.now() + path.extname(file.originalname)
        );
    },
});

const upload = multer({ storage: storage });



app.get('/', (req, res) => {
    res.render('index', { data: '' })
})


// const result = {
//     idType: "",
//     "idNumber": "",
//     "info": {
//       "name": "",
//       "fatherName": "",
//       "dob": "",
//     }
//   }


app.post('/extracttextfromimage', upload.single('file'), async (req, res) => {
    console.log("filepath", req.file.path)
    const imageBuffer = fs.readFileSync(req.file.path);
    try {

        const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/.',
        });
        const text = data.text;

        // const jsonText = text.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        // const jsonObject = JSON.parse(`{ "text": "${jsonText}" }`);
        // const jsonObject = JSON.parse(text);


        console.log("text", text);


        // const aadhaarNumberMatch = text.match(/\d{4}\s\d{4}\s\d{4}/g);
        // const aadhaarNumber = aadhaarNumberMatch ? aadhaarNumberMatch[0] : null;
        // const name = text.match(/Name[\s\n]+:(.*)/)[1].trim();

        const lines = text.split(/\n/);

        console.log("line", lines);

        const IsPan = lines.find(line => line.includes('INCOME TAX DEPARTMENT'));
        const IsDL = lines.find(line => line.includes('DLNo'));


        const doctype = IsPan ? "PanCard" : (IsDL ? "DL" : "AdharCard");
        var result = {};

        if (IsPan) {
            let pan = null;
            let name = null;
            let dob = null;
            let fatherName = null;


            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("Permanent Account Number") || lines[i].includes("PAN")) {
                    pan = lines[i].split(" ")[lines[i].split(" ").length - 1]; // Extract the last word from the line containing PAN
                    break;
                }
            }

            if (pan) {
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(pan)) {
                        name = lines[i].replace(pan, '').trim(); // Extract the name from the line that contains PAN
                        break;
                    }
                }

            }
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("Date of Birth") || lines[i].includes("DOB")) {
                    dob = lines[i].split(" ")[lines[i].split(" ").length - 2]; // Extract the second last word from the line containing DOB
                    break;
                }
            }

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("Father's Name") || lines[i].includes("Father Name")) {
                    fatherName = lines[i].split(" ").splice(2).join(" "); // Extract the name from the line that contains Father's Name
                    break;
                }
            }



            result = {
                idType: "PanCard",
                "idNumber": pan,
                "info": {
                    "name": name,
                    "fatherName": fatherName,
                    "dob": dob,

                }
            }


        }

        if (doctype === 'AdharCard') {
            const aadhaarNumber = lines.find(line => line.match(/\d{4}\s\d{4}\s\d{4}/))?.match(/\d{4}\s\d{4}\s\d{4}/)[0];
            // const name = lines.find(line => line.match(/^.*Name[\s\n]+:/))?.replace(/^.*Name[\s\n]+:\s*/, '');
            const name = lines[4];
            const yearOfBirth = lines.find(line => line.match(/Year of Birth[\s\n]*:/))?.match(/[\d]{4}/)[0];
            const gender = lines.find(line => line.match(/Male|Female/))?.toLowerCase();
            const Gender = gender.includes("female") ? "female" : "male";

            const jsonObject = { aadhaarNumber, name, yearOfBirth, Gender };


            result = {
                idType: "AddharCard",
                "idNumber": aadhaarNumber,
                "info": {
                    "name": name,
                    "fatherName": "N/A",
                    "dob": yearOfBirth,
                    "gender": Gender
                }
            }
        }



        console.log("line", lines);

        // console.log("jsonObject", jsonObject)

        res.json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
})




app.listen(port, function (err) {

    if (err) {
        console.log(`error in running the server: ${port}`)
    }
    console.log(`Server is running on port: ${port}`);
})



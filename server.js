import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import multer from 'multer';
import { db, bucket } from './firebaseAdmin.js'; // Use firebaseAdmin.js for Firestore and Storage
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { collection, getDocs } from 'firebase/firestore';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Function to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure directory existence
const ensureDirectoryExistence = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

app.post('/api/approve-volunteer', upload.none(), async (req, res) => {
    console.log('Received request to approve volunteer');
    const data = req.body;

    if (!data.firstName || !data.lastName || !data.id || !data.phone) {
        return res.status(400).send('Missing required fields');
    }

    // Full path to volDoc.docx
    const volDocPath = 'C:\\Users\\Tomer\\Desktop\\community-registration-web\\volDoc.docx';

    // Define paths for directories and files
    const volDocsDir = path.join(__dirname, 'VolDocs');
    const docPath = path.join(volDocsDir, 'updated_volDoc.docx');
    const pdfPath = path.join(volDocsDir, 'updated_volDoc.pdf');

    // Ensure directory existence
    ensureDirectoryExistence(volDocsDir);

    const command = `python fill_volunteer_form.py "${volDocPath}" "${data.firstName}" "${data.lastName}" "${data.id}" "${data.phone}" "${data.phone}" "${docPath}" "${pdfPath}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            console.error(stderr);
            return res.status(500).send('Server error');
        }

        try {
            const fileName = `bituahForms/${data.id}.pdf`;
            await bucket.upload(pdfPath, {
                destination: fileName,
                metadata: {
                    contentType: 'application/pdf',
                },
            });

            const file = bucket.file(fileName);
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: '03-09-2491',
            });

            // Search for volunteer document by id using getDocs
            console.log(`Searching for volunteer with id: ${data.id}`);
            const volunteersCollection = db.collection(db ,'Volunteers');
            console.log(`found collection`);
            const querySnapshot = await getDocs(collection(db, "Volunteers"));
            const volunteerDoc = querySnapshot.docs.find(doc => doc.data().id === data.id);

            if (!volunteerDoc) {
                console.error('Volunteer document not found');
                return res.status(404).send('Volunteer document not found');
            }

            const volunteerRef = volunteerDoc.ref;
            const volunteerData = volunteerDoc.data();

            if (volunteerData.confirmed) {
                console.error('Volunteer already confirmed');
                return res.status(400).send('Volunteer already confirmed');
            }

            console.log(`Updating volunteer document with id: ${data.id}`);
            await volunteerRef.update({ bituahForm: url, confirmed: true });

            res.send('Volunteer approved and form updated successfully');
        } catch (err) {
            console.error(`Firestore error: ${err.message}`);
            res.status(500).send('Failed to update Firestore');
        }
    });
});

app.get('/api/get-volunteers', async (req, res) => {
    const snapshot = await db.collection('Volunteers').where('confirmed', '==', false).get();
    const volunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(volunteers);
});

const PORT = 3003;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
});

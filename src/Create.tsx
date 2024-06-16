import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase'; // Ensure the correct path to your firebase config
import { collection, getDocs, query, addDoc, updateDoc, doc, getDoc, Timestamp, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Create.css';

const Create = () => {
    const [volunteerAreas, setVolunteerAreas] = useState<Array<{ id: string, withKids: boolean }>>([]);
    const [formData, setFormData] = useState({
        id: '',
        firstName: '',
        lastName: '',
        gender: '',
        phone: '',
        email: '',
        volunteerArea: '',
        policeApproval: null as File | null,
    });
    const [error, setError] = useState('');
    
const [withKids, setWithKids] = useState(false);
const [isSubmitDisabled, setIsSubmitDisabled] = useState(false); // Added state variable


    useEffect(() => {
        const fetchVolunteerAreas = async () => {
            const querySnapshot = await getDocs(collection(db, 'Volunteer Areas'));
            const areas = querySnapshot.docs.map(doc => ({
                id: doc.id,
                withKids: doc.data().withKids
            }));
            setVolunteerAreas(areas);
        };

        fetchVolunteerAreas();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            const file = files ? files[0] : null;
            if (file && name === 'policeApproval' && file.type !== 'application/pdf') {
                setError('PDF אנא העלה קובץ רק מסוג');
                
setFormData({
    ...formData,
    [name]: null,
});
setIsSubmitDisabled(true); // Disable submit button

            } else {
                setError('');
                
setFormData({
    ...formData,
    [name]: file,
});
setIsSubmitDisabled(false); // Enable submit button

            }
        } else {
            setFormData({
                ...formData,
                [name]: type === 'checkbox' ? checked : value,
            });
        }

        if (name === 'volunteerArea') {
            const selectedArea = volunteerAreas.find(area => area.id === value);
            setWithKids(selectedArea ? selectedArea.withKids : false);
        }
    };

    
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withKids && formData.gender === 'Male' && (!formData.policeApproval || formData.policeApproval.type !== 'application/pdf')) {
        setError('Police Approval file is required and must be a PDF.');
        return;
    }
    
        e.preventDefault();
        setError('');
        console.log('Form submitted:', formData); // Debugging line

        let policeFormURL = null;
        if (formData.policeApproval) {
            const policeFormRef = ref(storage, `policeForms/${formData.id}/${formData.policeApproval.name}`);
            try {
                await uploadBytes(policeFormRef, formData.policeApproval);
                policeFormURL = await getDownloadURL(policeFormRef);
                console.log('Police form uploaded:', policeFormURL); // Debugging line
            } catch (error) {
                console.error('Error uploading police approval: ', error);
                setError(`Failed to upload police approval. Error: ${error.message}`);
                return;
            }
        }

        const volunteerCollectionRef = collection(db, 'Volunteers');
        const volunteerDocQuery = query(volunteerCollectionRef);
        const querySnapshot = await getDocs(volunteerDocQuery);
        console.log('Volunteers query snapshot:', querySnapshot); // Debugging line
        const existingVolunteerDoc = querySnapshot.docs.find(doc => doc.data().id === formData.id);

        if (existingVolunteerDoc) {
            // Update existing volunteer details
            const volunteerDocRef = doc(db, 'Volunteers', existingVolunteerDoc.id);
            const existingVolunteerData = existingVolunteerDoc.data();
            console.log('Existing volunteer data:', existingVolunteerData); // Debugging line

            const updatedVolunteerArea = Array.isArray(existingVolunteerData.volunteerArea)
                ? [...new Set([...existingVolunteerData.volunteerArea, formData.volunteerArea])]
                : [formData.volunteerArea];

            try {
                await updateDoc(volunteerDocRef, {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    gender: formData.gender === 'male' ? 'M' : 'F',
                    phone: formData.phone,
                    email: formData.email,
                    volunteerArea: updatedVolunteerArea,
                    policeForm: policeFormURL || existingVolunteerData.policeForm,
                });
                console.log('Volunteer details updated successfully!'); // Debugging line
                alert('Volunteer details updated successfully!');
            } catch (error) {
                console.error('Error updating document: ', error);
                setError(`Failed to update volunteer details. Error: ${error.message}`);
                return;
            }
        } else {
            // Add a new volunteer document with an auto-generated ID
            try {
                await addDoc(volunteerCollectionRef, {
                    id: formData.id,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    gender: formData.gender === 'male' ? 'M' : 'F',
                    phone: formData.phone,
                    email: formData.email,
                    startDate: Timestamp.now(),
                    volunteerArea: [formData.volunteerArea],
                    confirmed: false,
                    policeForm: policeFormURL,
                });
                console.log('Volunteer added successfully!'); // Debugging line
                alert('Volunteer added successfully!');
            } catch (error) {
                console.error('Error adding document: ', error);
                setError(`Failed to add volunteer. Error: ${error.message}`);
                return;
            }
        }

        // Handle police approval upload to Police Forms collection
        if (policeFormURL) {
            const policeDocRef = doc(db, 'Police Forms', formData.id);
            const policeDoc = await getDoc(policeDocRef);

            try {
                if (policeDoc.exists()) {
                    await updateDoc(policeDocRef, {
                        Form: arrayUnion(policeFormURL)
                    });
                } else {
                    await setDoc(policeDocRef, {
                        Form: [policeFormURL]
                    });
                }
                console.log('Police approval added to Police Forms collection'); // Debugging line
                alert('Police approval uploaded successfully!');
            } catch (error) {
                console.error('Error updating police forms: ', error);
                setError(`Failed to update police forms. Error: ${error.message}`);
                return;
            }
        }

        // Clear the form fields
        setFormData({
            id: '',
            firstName: '',
            lastName: '',
            gender: '',
            phone: '',
            email: '',
            volunteerArea: '',
            policeApproval: null,
        });
        setWithKids(false);
    };

    return (
        <div className="create-container">
            <div className="create">
                <h2 className="main-title">דף הרשמה למתנדב חדש</h2>
                <h4 className="sub-title">מינהל קהילתי לב העיר</h4>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div>
                            <label htmlFor="id">מס' תעודת זהות</label>
                            <input type="text" id="id" name="id" value={formData.id} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="firstName">שם פרטי</label>
                            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div>
                            <label htmlFor="lastName">שם משפחה</label>
                            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="email">כתובת מייל</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div>
                            <label htmlFor="phone">מס' טלפון</label>
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div>
                            <label htmlFor="volunteer">תחום התנדבות</label>
                            <select id="volunteer" name="volunteerArea" value={formData.volunteerArea} onChange={handleChange} required>
                                <option value="">בחר תחום התנדבות</option>
                                {volunteerAreas.map(area => (
                                    <option key={area.id} value={area.id}>{area.id}</option>
                                ))}
                            </select>
                        </div>
                        <div className="gender-row">
                            <label>מין</label>
                            <div className="radio-group">
                                <label htmlFor="male">זכר</label>
                                <input type="radio" id="male" name="gender" value="male" onChange={handleChange} required />
                                <label htmlFor="female">נקבה</label>
                                <input type="radio" id="female" name="gender" value="female" onChange={handleChange} required />
                            </div>
                        </div>
                    </div>
                    {formData.gender === 'male' && withKids && (
                        <div className="form-row center">
                            <div>
                                <label htmlFor="policeApproval">אישור היעדר עבירות מין (חובה)</label>
                                <input type="file" id="policeApproval" name="policeApproval" onChange={handleChange} required={formData.gender === 'male' && withKids} />
                            </div>
                        </div>
                    )}
                    
                    <button type="submit" disabled={isSubmitDisabled}>שלח טופס</button> {/* הוספת ניטרול כפתור השליחה */}

                </form>
            </div>
        </div>
    );
};

export default Create;

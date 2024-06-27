import React, { useEffect, useState } from 'react';
import './EditVolunteerAreas.css';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const EditVolunteerAreas = () => {
    const [volunteerAreas, setVolunteerAreas] = useState([]);
    const [newAreaName, setNewAreaName] = useState('');
    const [newWhatsAppLink, setNewWhatsAppLink] = useState('');
    const [newWithKids, setNewWithKids] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Fetch volunteer areas from the database
        const fetchVolunteerAreas = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'Volunteer Areas'));
                const areas = snapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
                setVolunteerAreas(areas);
            } catch (error) {
                console.error('Error fetching volunteer areas:', error);
            }
        };
        fetchVolunteerAreas();
    }, []);

    const handleRemove = async (id) => {
        try {
            await deleteDoc(doc(db, 'Volunteer Areas', id));
            setVolunteerAreas(volunteerAreas.filter(area => area.id !== id));
        } catch (error) {
            console.error('Error removing volunteer area:', error);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setErrorMessage(''); // Reset error message
        try {
            const docRef = doc(db, 'Volunteer Areas', newAreaName);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setErrorMessage('תחום ההתנדבות הזה כבר קיים.');
            } else {
                await setDoc(doc(db, 'Volunteer Areas', newAreaName), {
                    'WhatsApp Link': newWhatsAppLink,
                    'withKids': newWithKids
                });
                setVolunteerAreas([...volunteerAreas, { id: newAreaName, 'WhatsApp Link': newWhatsAppLink, 'withKids': newWithKids }]);
                setNewAreaName('');
                setNewWhatsAppLink('');
                setNewWithKids(false);
            }
        } catch (error) {
            console.error('Error adding volunteer area:', error);
        }
    };

    return (
        <div className="create-container">
            <div className="create">
                <h2>ערוך תחומי התנדבות</h2>
                <table className="volunteer-table">
                    <thead>
                        <tr>
                            <th>פעולה</th>
                            <th>שם</th>
                        </tr>
                    </thead>
                    <tbody>
                        {volunteerAreas.length > 0 ? (
                            volunteerAreas.map(area => (
                                <tr key={area.id}>
                                    <td>
                                        <button
                                            className="remove-button"
                                            onClick={() => handleRemove(area.id)}
                                        >
                                            הסר
                                        </button>
                                    </td>
                                    <td>{area.id}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="2">לא נמצאו תחומי התנדבות.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <form onSubmit={handleAdd} className="add-form">
                    <h3>הוסף תחום התנדבות</h3>
                    <div className="form-row">
                        <label>:שם תחום ההתנדבות</label>
                        <input
                            type="text"
                            value={newAreaName}
                            onChange={(e) => setNewAreaName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-row">
                        <label>:קישור לקבוצת הוואטסאפ</label>
                        <input
                            type="text"
                            value={newWhatsAppLink}
                            onChange={(e) => setNewWhatsAppLink(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-row">
                    <label>עם ילדים:</label>
                        <div className="radio-group">
                            <label>
                                כן
                                <input
                                    type="radio"
                                    value={true}
                                    checked={newWithKids === true}
                                    onChange={() => setNewWithKids(true)}
                                />
                            </label>
                            <label>
                                לא
                                <input
                                    type="radio"
                                    value={false}
                                    checked={newWithKids === false}
                                    onChange={() => setNewWithKids(false)}
                                />
                            </label>
                        </div>
                    </div>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                    <button type="submit" className="add-button">הוסף</button>
                </form>
            </div>
        </div>
    );
};

export default EditVolunteerAreas;

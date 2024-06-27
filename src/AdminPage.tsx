import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminPage.css';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const AdminPage = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [selectedVolunteer, setSelectedVolunteer] = useState(null);

    useEffect(() => {
        // Fetch volunteers from the database
        const fetchVolunteers = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'Volunteers'));
                const volunteersList = snapshot.docs
                    .filter(doc => doc.data().confirmed === false)
                    .map(doc => ({ docId: doc.id, ...doc.data() }));
                setVolunteers(volunteersList);
            } catch (error) {
                console.error('Error fetching volunteers:', error);
            }
        };
        fetchVolunteers();
    }, []);

    const handleAccept = async (id) => {
        try {
            const volunteerQuery = query(collection(db, 'Volunteers'), where('id', '==', id));
            const snapshot = await getDocs(volunteerQuery);
            if (!snapshot.empty) {
                const volunteerDoc = snapshot.docs[0];
                await updateDoc(volunteerDoc.ref, { confirmed: true });
                setVolunteers(volunteers.filter(volunteer => volunteer.id !== id));
                window.alert('המתנדב אושר בהצלחה!');
            }
        } catch (error) {
            console.error('Error accepting volunteer:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            const volunteerQuery = query(collection(db, 'Volunteers'), where('id', '==', id));
            const snapshot = await getDocs(volunteerQuery);
            if (!snapshot.empty) {
                const volunteerDoc = snapshot.docs[0];
                await deleteDoc(volunteerDoc.ref);
                setVolunteers(volunteers.filter(volunteer => volunteer.id !== id));
                window.alert('המתנדב נדחה ונמחק מהמערכת');
            }
        } catch (error) {
            console.error('Error rejecting volunteer:', error);
        }
    };

    const showDetails = (volunteer) => {
        setSelectedVolunteer(volunteer);
    };

    const closeDetails = () => {
        setSelectedVolunteer(null);
    };

    return (
        <div className="create-container">
            <div className="create">
                <h2>דף מנהל</h2>
                <Link to="/edit-volunteer-areas" className="edit-link">ערוך תחומי התנדבות</Link>
                <table className="volunteer-table">
                    <thead>
                        <tr>
                            <th>פעולות</th>
                            <th>פרטים</th>
                            <th>מספר זהות</th>
                            <th>שם מתנדב</th>
                        </tr>
                    </thead>
                    <tbody>
                        {volunteers.length > 0 ? (
                            volunteers.map(volunteer => (
                                <tr key={volunteer.docId}>
                                    <td className="actions-buttons">
                                        <button className="accept-button" onClick={() => handleAccept(volunteer.id)}>
                                            קבל
                                        </button>
                                        <button className="reject-button" onClick={() => handleReject(volunteer.id)}>
                                            דחה
                                        </button>
                                    </td>
                                    <td>
                                        <button className="details-button" onClick={() => showDetails(volunteer)}>
                                            פרטים
                                        </button>
                                    </td>
                                    <td>{volunteer.id}</td>
                                    <td>{volunteer.firstName} {volunteer.lastName}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">לא נמצאו מתנדבים לא מאושרים</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {selectedVolunteer && (
                    <div className="details-modal">
                        <div className="details-content">
                            <h3>פרטי מתנדב</h3>
                            <p><strong>שם פרטי:</strong> {selectedVolunteer.firstName}</p>
                            <p><strong>שם משפחה:</strong> {selectedVolunteer.lastName}</p>
                            <p><strong>מספר זהות:</strong> {selectedVolunteer.id}</p>
                            <p><strong>מין:</strong> {selectedVolunteer.gender === 'M' ? 'זכר' : selectedVolunteer.gender === 'F' ? 'נקבה' : 'לא ידוע'}</p>
                            <p><strong>אימייל:</strong> {selectedVolunteer.email}</p>
                            <p><strong>טלפון:</strong> {selectedVolunteer.phone}</p>
                            <p><strong>תחום התנדבות:</strong> {Array.isArray(selectedVolunteer.volunteerArea) ? selectedVolunteer.volunteerArea.join(', ') : selectedVolunteer.volunteerArea}</p>
                            {selectedVolunteer.policeForm && (
                                <p>
                                    <strong>טופס אישור מהמשטרה:</strong>{' '}
                                    <a href={selectedVolunteer.policeForm} target="_blank" rel="noopener noreferrer">
                                        צפה בטופס
                                    </a>
                                </p>
                            )}
                            <button className="close-button" onClick={closeDetails}>סגור</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
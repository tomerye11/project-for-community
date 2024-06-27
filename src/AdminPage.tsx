import React, { useEffect, useState } from 'react';
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
                <h2>Admin Page</h2>
                <a href="/edit-volunteer-areas" className="edit-link">Edit Volunteer Areas</a>
                <table className="volunteer-table">
                    <thead>
                        <tr>
                            <th>Volunteer Name</th>
                            <th>ID</th>
                            <th>Details</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {volunteers.length > 0 ? (
                            volunteers.map(volunteer => (
                                <tr key={volunteer.docId}>
                                    <td>{volunteer.firstName} {volunteer.lastName}</td>
                                    <td>{volunteer.id}</td>
                                    <td>
                                        <button className="details-button" onClick={() => showDetails(volunteer)}>
                                            Details
                                        </button>
                                    </td>
                                    <td className="actions-buttons">
                                        <button className="accept-button" onClick={() => handleAccept(volunteer.id)}>
                                            Accept
                                        </button>
                                        <button className="reject-button" onClick={() => handleReject(volunteer.id)}>
                                            Reject
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No unconfirmed volunteers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {selectedVolunteer && (
                    <div className="details-modal">
                        <div className="details-content">
                            <h3>Volunteer Details</h3>
                            <p><strong>First Name:</strong> {selectedVolunteer.firstName}</p>
                            <p><strong>Last Name:</strong> {selectedVolunteer.lastName}</p>
                            <p><strong>Email:</strong> {selectedVolunteer.email}</p>
                            <p><strong>Phone:</strong> {selectedVolunteer.phone}</p>
                            <p><strong>Volunteer Area:</strong> {selectedVolunteer.volunteerArea}</p>
                            <p><strong>Gender:</strong> {selectedVolunteer.gender === 'M' ? 'זכר' : selectedVolunteer.gender === 'F' ? 'נקבה' : 'לא ידוע'}</p>
                            {selectedVolunteer.policeForm && (
                              <p>
                                 <strong>Police Form:</strong>{' '}
                                    <a href={selectedVolunteer.policeForm} target="_blank" rel="noopener noreferrer">
                                     View Police Form
                                    </a>
                                </p>
                            )}

                            <button className="close-button" onClick={closeDetails}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;

import React, { useState, useEffect } from 'react';
import './AdminPage2.css';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, updateDoc, writeBatch, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as XLSX from 'xlsx';


ChartJS.register(ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, ChartDataLabels);

const AdminPage2: React.FC = () => {
    const [volunteerAreas, setVolunteerAreas] = useState<any[]>([]);
    const [selectedMenu, setSelectedMenu] = useState('statistics');
    const [editAreaId, setEditAreaId] = useState<string | null>(null);
    const [updatedArea, setUpdatedArea] = useState<any>({});
    const [message, setMessage] = useState<string | null>(null);
    const [newArea, setNewArea] = useState<{ id: string, withKids: boolean, whatsAppLink: string }>({
        id: '',
        withKids: false,
        whatsAppLink: ''
      });
    const [volunteerStats, setVolunteerStats] = useState<{ [key: string]: number }>({});
    const [totalVolunteers, setTotalVolunteers] = useState<number>(0);
    const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('name');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [volunteers, setVolunteers] = useState<any[]>([]);

    interface Volunteer {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        gender: string;
        startDate?: any;
        volunteerArea?: string[];
        confirmed?: boolean;
        policeForm?: string;
        BLform?: string;
    }

    const handleDetailsClick = (volunteer: Volunteer) => {
        console.log("Volunteer details clicked: ", volunteer);
        setSelectedVolunteer(volunteer);
    };

    /**
     * useEffect hook to fetch data based on the selected menu.
     * If 'editVolunteerAreas' is selected, fetches volunteer areas from Firestore.
     * If 'volunteerTable', 'approveVolunteers', or 'statistics' is selected, fetches volunteers from Firestore.
     * If 'statistics' is selected, calculates and sets volunteer statistics.
    */
    useEffect(() => {
        const fetchData = async () => {
            if (selectedMenu === 'editVolunteerAreas') {
                const querySnapshot = await getDocs(collection(db, "Volunteer Areas"));
                const areas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVolunteerAreas(areas);
            } else if (selectedMenu === 'volunteerTable' || selectedMenu === 'approveVolunteers' || selectedMenu === 'statistics') {
                const querySnapshot = await getDocs(collection(db, "Volunteers"));
                const volunteers = querySnapshot.docs.map(doc => ({
                    id: doc.data().id || '',
                    firstName: doc.data().firstName || '',
                    lastName: doc.data().lastName || '',
                    email: doc.data().email || '',
                    phone: doc.data().phone || '',
                    gender: doc.data().gender || '',
                    startDate: doc.data().startDate,
                    volunteerArea: doc.data().volunteerArea,
                    confirmed: doc.data().confirmed,
                    policeForm: doc.data().policeForm,
                    BLform: doc.data().BLform
                }));
                setVolunteers(volunteers);

                if (selectedMenu === 'statistics') {
                    const stats = volunteers.filter(volunteer => volunteer.confirmed).reduce((acc, volunteer) => {
                        volunteer.volunteerArea?.forEach((area: string | number) => {
                            acc[area] = (acc[area] || 0) + 1;
                        });
                        return acc;
                    }, {} as { [key: string]: number });

                    setVolunteerStats(stats);
                    setTotalVolunteers(volunteers.filter(volunteer => volunteer.confirmed).length);
                }
            }
        };

        fetchData();
    }, [selectedMenu]);

    /**
     * Fetches confirmed volunteers from the Firestore database.
     * Queries the 'Volunteers' collection where 'confirmed' is true.
     * Updates the 'volunteers' state with the fetched data.
    */
    const fetchVolunteers = async () => {
        const volunteersRef = collection(db, 'Volunteers');
        const q = query(volunteersRef, where('confirmed', '==', true));
        const querySnapshot = await getDocs(q);
        let volunteerList: any[] = [];
        querySnapshot.forEach((doc) => {
            volunteerList.push({ id: doc.id, ...doc.data() });
        });
        setVolunteers(volunteerList);
    };

    useEffect(() => {
        fetchVolunteers();
        fetchVolunteerAreas();
    }, []);

    /**
     * useEffect hook to handle search and display based on selected menu and search term.
     * If 'volunteerTable' is selected, performs search if searchTerm is not empty; otherwise shows all volunteers.
     * If 'editVolunteerAreas' is selected, performs search for volunteer areas.
    */
    useEffect(() => {
        if (selectedMenu === 'volunteerTable') {
            if (searchTerm !== '') {
                handleSearch();
            } else {
                handleShowAllVolunteers();
            }
        } else if (selectedMenu === 'editVolunteerAreas') {
            handleSearchArea();
        }
    }, [searchTerm, searchType, selectedMenu]);

    /**
     * Fetches all confirmed volunteers from the Firestore database.
     * Queries the 'Volunteers' collection where 'confirmed' is true.
     * Updates the 'searchResults' state with the fetched data.
     * Logs an error message if the fetch operation fails.
    */
    const handleShowAllVolunteers = async () => {
        try {
            const volunteersRef = collection(db, 'Volunteers');
            const confirmedQuery = query(volunteersRef, where('confirmed', '==', true));
            const querySnapshot = await getDocs(confirmedQuery);

            let allVolunteers: React.SetStateAction<any[]> = [];
            querySnapshot.forEach(doc => {
                allVolunteers.push({ id: doc.id, ...doc.data() });
            });

            setSearchResults(allVolunteers);
        } catch (error) {
            console.error('Error fetching all volunteers:', error);
        }
    };

    /**
     * Searches confirmed volunteers in the Firestore database based on the search type and term.
     * - If searchType is 'name', searches by first or last name.
     * - If searchType is 'id', searches by volunteer ID.
     * - If searchType is 'volunteerArea', searches by volunteer area.
     * Updates the 'searchResults' state with the search results.
     * Logs an error message if the search operation fails.
    */
    const handleSearch = async () => {
		try {
		  const volunteersRef = collection(db, 'Volunteers');
		  let searchResults = [];
	  
		  console.log('Starting search with:', { searchTerm, searchType });
	  
		  // Create a query that filters only confirmed volunteers
		  const confirmedQuery = query(volunteersRef, where('confirmed', '==', true));
	  
		  if (searchType === 'name') {
			const term = searchTerm.trim();
			console.log('Searching by name with term:', term);
	  
			// Query to find first names matching the term
			const nameQuery = query(
			  confirmedQuery,
			  where('firstName', '>=', term),
			  where('firstName', '<=', term + '\uf8ff')
			);
	  
			// Query to find last names matching the term
			const lastNameQuery = query(
			  confirmedQuery,
			  where('lastName', '>=', term),
			  where('lastName', '<=', term + '\uf8ff')
			);
	  
			// Execute both queries and wait for their results
			const [firstNameSnapshot, lastNameSnapshot] = await Promise.all([
			  getDocs(nameQuery),
			  getDocs(lastNameQuery)
			]);
	  
			// Use a map to combine results from both queries without duplicates
			const resultsMap = new Map();
			firstNameSnapshot.forEach(doc => {
			  const docData = { id: doc.id, ...doc.data() };
			  resultsMap.set(doc.id, docData);
			});
	  
			lastNameSnapshot.forEach(doc => {
			  const docData = { id: doc.id, ...doc.data() };
			  if (!resultsMap.has(doc.id)) {
				resultsMap.set(doc.id, docData);
			  }
			});
	  
			searchResults = Array.from(resultsMap.values());
	  
		  } else if (searchType === 'id') {
			console.log('Searching by ID with term:', searchTerm);
	  
			// Query to find IDs matching the term
			const idQuery = query(
			  confirmedQuery,
			  where('id', '>=', searchTerm),
			  where('id', '<=', searchTerm + '\uf8ff')
			);
			const querySnapshot = await getDocs(idQuery);
			querySnapshot.forEach(doc => {
			  searchResults.push({ id: doc.id, ...doc.data() });
			});
	  
		  } else if (searchType === 'volunteerArea') {
			console.log('Searching by volunteer area with term:', searchTerm);
	  
			// Query to find volunteer areas containing the term
			const areaQuery = query(
			  confirmedQuery,
			  where('volunteerArea', 'array-contains', searchTerm)
			);
			const querySnapshot = await getDocs(areaQuery);
			querySnapshot.forEach(doc => {
			  searchResults.push({ id: doc.id, ...doc.data() });
			});
		  }
	  
		  console.log('Search results:', searchResults);
		  setSearchResults(searchResults);
		} catch (error) {
		  console.error('Error searching volunteers:', error);
		}
	  };


    /**
     * Searches volunteer areas in the Firestore database based on the search term.
     * - If searchTerm is empty, sets the search results to the existing volunteer areas.
     * - Otherwise, queries the 'Volunteer Areas' collection for areas matching the search term.
     * Updates the 'searchResults' state with the search results.
    */
    const handleSearchArea = async () => {
        const volunteerAreasRef = collection(db, 'Volunteer Areas');
        let searchResults: React.SetStateAction<any[]> = [];

        if (searchTerm === '') {
            setSearchResults(volunteerAreas);
            return;
        }

        const areaQuery = query(volunteerAreasRef, where('id', '>=', searchTerm), where('id', '<=', searchTerm + '\uf8ff'));
        const querySnapshot = await getDocs(areaQuery);
        querySnapshot.forEach((doc) => {
            searchResults.push({ id: doc.id, ...(doc.data()) });
        });

        setSearchResults(searchResults);
    };

    /**
     * Deletes a volunteer from the Firestore database based on the volunteer ID.
     * - Queries the 'Volunteers' collection to find the document with the matching volunteer ID.
     * - If found, deletes the document and refreshes the volunteer list.
     * - Logs an error message if the volunteer is not found or if the delete operation fails.
    */
    const handleDeleteVolunteer = async (volunteerId: unknown) => {
        try {
            const volunteersRef = collection(db, 'Volunteers');

            // Query to find the volunteer document with the matching ID
            const querySnapshot = await getDocs(query(volunteersRef, where('id', '==', volunteerId)));

            if (!querySnapshot.empty) {
                // Get the ID of the first document in the query results
                const docId = querySnapshot.docs[0].id;
                await deleteDoc(doc(db, 'Volunteers', docId));

                // Refresh the volunteer list after deletion
                handleShowAllVolunteers();
            } else {
                console.error('Volunteer not found');
            }
        } catch (error) {
            console.error('Error deleting volunteer:', error);
        }
    };

    /**
     * Exports confirmed volunteers to an Excel file.
     * Filters confirmed volunteers, formats the data, 
     * and creates an Excel file named 'ConfirmedVolunteers.xlsx'.
    */
    const exportToExcel = () => {
        const confirmedVolunteers = volunteers
            .filter(volunteer => volunteer.confirmed)
            .map(volunteer => ({
                'מספר תעודת זהות': volunteer.id,
                'שם פרטי': volunteer.firstName,
                'שם משפחה': volunteer.lastName,
                'כתובת מייל': volunteer.email,
                'מספר טלפון': volunteer.phone,
                'מין': volunteer.gender,
                'תאריך התחלה': volunteer.startDate ? volunteer.startDate.toDate().toLocaleDateString("he-IL") : '',
                'תחום התנדבות': volunteer.volunteerArea ? volunteer.volunteerArea.join(', ') : ''
            }));

        const ws = XLSX.utils.json_to_sheet(confirmedVolunteers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Confirmed Volunteers');

        XLSX.writeFile(wb, 'ConfirmedVolunteers.xlsx');
    };

    /**
     * Fetches volunteer areas from the Firestore database.
    */
    const fetchVolunteerAreas = async () => {
        const querySnapshot = await getDocs(collection(db, "Volunteer Areas"));
        const areas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVolunteerAreas(areas);
    };

    /**
     * Deletes a volunteer area from the Firestore database.
     * - Deletes the document with the given ID from the 'Volunteer Areas' collection.
     * - Fetches updated volunteer areas and displays a success message.
     * - Clears the success message after 2.5 seconds.
    */
    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, "Volunteer Areas", id));
        fetchVolunteerAreas();
        setMessage('התחום התנדבות נמחק בהצלחה');
        setTimeout(() => {
            setMessage(null);
        }, 2500);
    };

    const handleEdit = (area: any) => {
        setEditAreaId(area.id);
        setUpdatedArea(area);
    };

    /**
     * Updates the state for an input field change.
     * Sets the value of the changed input field in the 'updatedArea' state.
    */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUpdatedArea((prevArea: any) => ({
            ...prevArea,
            [name]: value,
        }));
    };

    /**
     * Updates the state for a radio button change.
     * Sets the boolean value of the changed radio button in the 'updatedArea' state.
    */
    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUpdatedArea((prevArea: any) => ({
            ...prevArea,
            [name]: value === 'true',
        }));
    };

    const closeModal = () => {
        setSelectedVolunteer(null);
    };

    /**
     * Saves or updates a volunteer area in the Firestore database.
     * - Validates required fields.
     * - Handles creating, updating, or deleting documents and updating related volunteers.
     * - Refreshes volunteer areas and shows a success message.
    */
    const handleSave = async () => {
        if (!updatedArea.id || updatedArea.withKids === undefined || !updatedArea.whatsAppLink) {
            setMessage('נא למלא את כל השדות.');
            setTimeout(() => {
                setMessage(null);
            }, 2500);
            return;
        }

        if (editAreaId && updatedArea.id !== editAreaId) {
            await createNewDocument(updatedArea);
            await deleteOldDocument(editAreaId);

            // Update the volunteer areas for all volunteers
            const volunteersSnapshot = await getDocs(collection(db, 'Volunteers'));
            const batch = writeBatch(db);

            volunteersSnapshot.forEach((doc) => {
                const volunteer = doc.data();
                if (volunteer.volunteerArea && volunteer.volunteerArea.includes(editAreaId)) {
                    const updatedVolunteerAreas = volunteer.volunteerArea.map((area: string) =>
                        area === editAreaId ? updatedArea.id : area
                    );
                    batch.update(doc.ref, { volunteerArea: updatedVolunteerAreas });
                }
            });

            await batch.commit();
        } else {
            await setDoc(doc(db, "Volunteer Areas", updatedArea.id), updatedArea);
        }

        setEditAreaId(null);
        fetchVolunteerAreas();
        setMessage('התחום התנדבות עודכן בהצלחה');
        setTimeout(() => {
            setMessage(null);
        }, 2500);
    };

    const createNewDocument = async (newArea: any) => {
        await setDoc(doc(db, "Volunteer Areas", newArea.id), newArea);
    };

    const deleteOldDocument = async (oldId: string) => {
        await deleteDoc(doc(db, "Volunteer Areas", oldId));
    };

    const handleCancel = () => {
        setEditAreaId(null);
    };

    const handleNewAreaInputChange = (e: { target: { name: any; value: any; }; }) => {
        const { name, value } = e.target;
        setNewArea({ ...newArea, [name]: value });
    };

    const handleNewAreaRadioChange = (e: { target: { value: string; }; }) => {
        setNewArea({ ...newArea, withKids: e.target.value === "true" });
    };

    /**
     * Adds a new volunteer area to the Firestore database.
     * - Validates required fields.
     * - Creates a new document for the volunteer area.
     * - Resets the form and shows a success or error message.
    */
    const handleAddArea = async () => {
        if (!newArea.id || newArea.withKids === undefined || !newArea.whatsAppLink) {
            setMessage('נא למלא את כל השדות.');
            setTimeout(() => {
                setMessage(null);
            }, 2500);
            return;
        }

        try {
            await createNewDocument(newArea);
            setMessage('התחום התנדבות נוסף בהצלחה');
            setTimeout(() => {
                setMessage(null);
            }, 2500);
            setNewArea({ id: '', withKids: false, whatsAppLink: '' }); // Reset form
        } catch (error) {
            console.error('Error adding document: ', error);
            setMessage('שגיאה בהוספת תחום התנדבות.');
            setTimeout(() => {
                setMessage(null);
            }, 2500);
        }
    };

    /**
     * Approves a volunteer by generating and uploading a PDF, updating Firestore, and sending an email.
     * - Fetches volunteer and area data from Firestore.
     * - Uses a server to generate a PDF and sends it to the volunteer.
     * - Updates volunteer status and PDF URL in Firestore.
     * - Displays success or error messages.
    */
    const handleApprove = async (volunteerId: string) => {
        try {
            console.log("Fetching volunteers...");
            const querySnapshot = await getDocs(collection(db, "Volunteers"));
            console.log("Volunteers fetched successfully.");

            const volunteerDoc = querySnapshot.docs.find(doc => doc.data().id === volunteerId);
            if (volunteerDoc) {
                const volunteerData = volunteerDoc.data();
                console.log("Volunteer found:", volunteerData);

                const arr = [
                    volunteerData.firstName,
                    volunteerData.lastName,
                    volunteerData.id,
                    volunteerData.email,
                    volunteerData.phone,
                    volunteerData.volunteerArea[0]
                ];
                console.log("Array created:", arr);

                // Fetch the volunteer area document
                const volunteerAreaDoc = await getDoc(doc(db, "Volunteer Areas", volunteerData.volunteerArea[0]));
                if (!volunteerAreaDoc.exists()) {
                    setMessage(".תחום התנדבות לא נמצא");
                    setTimeout(() => {
                        setMessage(null);
                    }, 2500);
                    return;
                }
                const volunteerAreaData = volunteerAreaDoc.data();
                const whatsAppLink = volunteerAreaData.whatsAppLink;

                setMessage("...המתן, מאשר מתנדב");
                const response = await fetch('http://localhost:5008/generate_pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ arr }),
                });
                console.log("PDF generation request sent.");

                if (response.ok) {
                    console.log("PDF generated successfully.");
                    const pdfBlob = await response.blob();
                    // const pdfURL = URL.createObjectURL(pdfBlob);
                    const pdfPath = `C:/BituahLeumiForms/${arr[2]}.pdf`;

                    setVolunteers(prevVolunteers => prevVolunteers.map(volunteer =>
                        volunteer.id === volunteerId ? { ...volunteer, confirmed: true } : volunteer
                    ));

                    // uploading the filr to Firestore
                    setMessage("...המתן, יוצר קובץ ביטוח לאומי");
                    const storage = getStorage();
                    const storageRef = ref(storage, `BituahLeumiForms/${arr[2]}.pdf`);
                    await uploadBytes(storageRef, pdfBlob);
                    const downloadURL = await getDownloadURL(storageRef);

                    // Update the volunteer with the PDF URL
                    await updateDoc(doc(db, "Volunteers", volunteerDoc.id), {
                        confirmed: true,
                        BLform: downloadURL
                    });
                    console.log("Volunteer confirmed in Firestore.");

                    // Send an email to the volunteer with the PDF file and a link to the WhatsApp group
                    setMessage("...המתן, שולח מייל אישור");
                    await fetch('http://localhost:5008/approve_volunteer', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: volunteerData.email, pdf_path: pdfPath, whatsAppLink }),
                    });
                    console.log("Email sent successfully.");
                    setMessage("!המתנדב אושר בהצלחה");


                } else {
                    console.error("Error in PDF generation:", response.statusText);
                    setMessage("שגיאה ביצירת ה-PDF.");
                }

                setTimeout(() => {
                    setMessage(null);
                }, 2500);
            } else {
                console.error("Volunteer not found.");
                setMessage("מתנדב לא נמצא.");
                setTimeout(() => {
                    setMessage(null);
                }, 2500);
            }
        } catch (error) {
            console.error("Error in handleApprove:  ", error);
            setMessage("שגיאה באישור המתנדב.");
            setTimeout(() => {
                setMessage(null);
            }, 2500);
        }
    };

    /**
     * Rejects a volunteer by deleting their document from Firestore and sending a rejection email.
     * - Fetches volunteer data from Firestore.
     * - Sends a rejection email using the server.
     * - Deletes the volunteer document from Firestore.
     * - Updates the volunteer list and displays a success or error message.
    */
    const handleReject = async (volunteerId: any) => {
        try {
            const querySnapshot = await getDocs(collection(db, "Volunteers"));
            const volunteerDoc = querySnapshot.docs.find(doc => doc.data().id === volunteerId);

            if (volunteerDoc) {
                const volunteerData = volunteerDoc.data();

                // Send a request to the Flask server to send a rejection email
                await fetch('http://localhost:5008/reject_volunteer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: volunteerData.email }),
                });

                await deleteDoc(doc(db, "Volunteers", volunteerDoc.id));
                setVolunteers(prevVolunteers => prevVolunteers.filter(volunteer => volunteer.id !== volunteerId));
                setMessage("המתנדב נדחה בהצלחה!");
                setTimeout(() => {
                    setMessage(null);
                }, 2500);
            } else {
                console.error('Volunteer not found');
            }
        } catch (error) {
            setMessage("שגיאה בדחיית המתנדב.");
            setTimeout(() => {
                setMessage(null);
            }, 2500);
        }
    };

    return (
        <div>
            <body>
                <div className="wrapper">
                    <div className="header">
                        <h2 className="header-title">דף מנהל - מינהל קהילתי לב העיר</h2>
                        <img
                            src="logo2.jpg"
                            alt="Logo"
                            className="logo"
                            onClick={() => setSelectedMenu('statistics')} // Add click event to the logo
                        />
                    </div>

                    <div className="container">
                        <div className="row">
                            <div className="column middle">

                                {message && <div className="message">{message}</div>}

                                {selectedMenu === 'statistics' && (
                                    <div>
                                        <h3 className="large-margin-bottom" >נתוני המינהל</h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '100px' }}>
                                            <div style={{ width: '45%', height: '400px' }}>
                                                <Pie
                                                    data={{
                                                        labels: Object.keys(volunteerStats),
                                                        datasets: [
                                                            {
                                                                data: Object.values(volunteerStats),
                                                                backgroundColor: [
                                                                    '#FF6384',
                                                                    '#36A2EB',
                                                                    '#FFCE56',
                                                                    '#4BC0C0',
                                                                    '#9966FF',
                                                                    '#FF9F40'
                                                                ],
                                                            },
                                                        ],
                                                    }}
                                                    options={{
                                                        plugins: {
                                                            datalabels: {
                                                                formatter: (value: number, context: any) => {
                                                                    const total = context.chart.data.datasets[0].data.reduce((acc: number, curr: number) => acc + curr, 0);
                                                                    const percentage = ((value / total) * 100).toFixed(2) + '%';
                                                                    return percentage;
                                                                },
                                                                color: '#fff',
                                                                font: {
                                                                    size: 14,
                                                                }
                                                            },
                                                            legend: {
                                                                position: 'top',
                                                                labels: {
                                                                    font: {
                                                                        size: 16,
                                                                    }
                                                                }
                                                            },
                                                        },
                                                        maintainAspectRatio: false,
                                                    }}
                                                    width={400}
                                                    height={400}
                                                />
                                            </div>
                                            <div style={{ width: '45%', height: '400px' }}>
                                                <Bar
                                                    data={{
                                                        labels: Object.keys(volunteerStats),
                                                        datasets: [
                                                            {
                                                                label: 'כמות מתנדבים',
                                                                data: Object.values(volunteerStats),
                                                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                                                borderColor: 'rgba(75, 192, 192, 1)',
                                                                borderWidth: 1,
                                                            },
                                                        ],
                                                    }}
                                                    options={{
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                            },
                                                        },
                                                        plugins: {
                                                            legend: {
                                                                display: false,
                                                            },
                                                        },
                                                        maintainAspectRatio: false,
                                                    }}
                                                    width={400}
                                                    height={400}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p>{`סה"כ מתנדבים מאושרים: ${totalVolunteers}`}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedMenu === 'volunteerTable' && (
                                    <>
                                        <h3 className="large-margin-bottom">טבלת מתנדבים מאושרים</h3>
                                        <div className="search-container">
                                            <button className="export-button" onClick={exportToExcel}>ייצוא לאקסל</button>
                                            <div className="search-box">
                                                <select
                                                    value={searchType}
                                                    onChange={(e) => setSearchType(e.target.value)}
                                                    className="search-select"
                                                >
                                                    <option value="name">שם</option>
                                                    <option value="id">תעודת זהות</option>
                                                    <option value="volunteerArea">תחום התנדבות</option>
                                                </select>
                                                {searchType === 'volunteerArea' ? (
                                                    <select
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="search-select"
                                                    >
                                                        <option value="">בחר תחום התנדבות</option>
                                                        {volunteerAreas.map(area => (
                                                            <option key={area.id} value={area.id}>{area.id}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="חיפוש"
                                                        className="search-input"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>פעולות</th>
                                                    <th>תחום התנדבות</th>
                                                    <th>מס' תעודת זהות</th>
                                                    <th>שם</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {searchResults.length === 0 && searchTerm ? (
                                                    <tr>
                                                        <td colSpan={4}>לא נמצאו מתנדבים</td> {/* Update colspan to include the new column */}
                                                    </tr>
                                                ) : (
                                                    (searchResults.length > 0 ? searchResults : volunteers)
                                                        .filter(volunteer => volunteer.confirmed) // Filter volunteers whose 'confirmed' field is true
                                                        .map(volunteer => (
                                                            <tr key={volunteer.id}>
                                                                <td>
                                                                    <button className="action-button" onClick={() => handleDetailsClick(volunteer)}>הצג פרטים</button>
                                                                    <button className="action-button" onClick={() => handleDeleteVolunteer(volunteer.id)}>הסר</button>
                                                                </td>
                                                                <td>{Array.isArray(volunteer.volunteerArea) ? volunteer.volunteerArea.join(', ') : ''}</td>
                                                                <td>{volunteer.id}</td>
                                                                <td>{volunteer.firstName} {volunteer.lastName}</td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {selectedVolunteer && (
                                    <div className="modal" style={{ display: 'flex' }}>
                                        <div className="modal-content">
                                            <div className="modal-header">
                                                <h4>{selectedVolunteer.firstName + ' ' + selectedVolunteer.lastName}</h4>
                                            </div>
                                            <div className="modal-body">
                                                <p>מס' תעודת זהות: {selectedVolunteer.id}</p>
                                                <p>Email: {selectedVolunteer.email}</p>
                                                <p>מין: {selectedVolunteer.gender === 'F' ? 'נקבה' : 'זכר'}</p>
                                                <p>טלפון: {selectedVolunteer.phone}</p>
                                                <p>תאריך התחלה: {selectedVolunteer.startDate?.toDate().toLocaleDateString("he-IL")}</p>
                                                <p>תחומי התנדבות: {selectedVolunteer.volunteerArea?.join(', ')}</p>
                                                <p>אושר: {selectedVolunteer.confirmed ? 'כן' : 'לא'}</p>
                                                {selectedVolunteer.policeForm && (
                                                    <p>
                                                        אישור היעדר עבירות מין:{' '}
                                                        <a href={selectedVolunteer.policeForm} target="_blank" rel="noopener noreferrer">
                                                            צפה בטופס
                                                        </a>
                                                    </p>
                                                )}
                                                {selectedVolunteer.BLform && (
                                                    <p>
                                                        טופס ביטוח לאומי:{' '}
                                                        <a href={selectedVolunteer.BLform} target="_blank" rel="noopener noreferrer">
                                                            צפה בטופס
                                                        </a>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="modal-footer">
                                                <button className="action-button" onClick={closeModal}>סגור</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedMenu === 'editVolunteerAreas' && (
                                    <>
                                        <h3 className="large-margin-bottom">עריכת תחומי התנדבות</h3>
                                        <div className="search-container2">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="חפש תחום התנדבות"
                                                className="search-input2"
                                            />
                                        </div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>פעולות</th>
                                                    <th>התנדבות עם ילדים</th>
                                                    <th>לינק לקבוצת הוואסטאפ</th>
                                                    <th>שם</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(searchTerm ? searchResults : volunteerAreas).map(area => (
                                                    <tr key={area.id}>
                                                        <td>
                                                            {editAreaId === area.id ? (
                                                                <>
                                                                    <button className="action-button" onClick={handleSave}>שמור</button>
                                                                    <button className="action-button" onClick={handleCancel}>ביטול</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className="action-button" onClick={() => handleDelete(area.id)}>הסר</button>
                                                                    <button className="action-button" onClick={() => handleEdit(area)}>ערוך</button>
                                                                </>
                                                            )}
                                                        </td>
                                                        {editAreaId === area.id ? (
                                                            <>
                                                                <td>
                                                                    <label>
                                                                        <input
                                                                            type="radio"
                                                                            name="withKids"
                                                                            value="true"
                                                                            checked={updatedArea.withKids === true}
                                                                            onChange={handleRadioChange}
                                                                        />
                                                                        כן
                                                                    </label>
                                                                    <label>
                                                                        <input
                                                                            type="radio"
                                                                            name="withKids"
                                                                            value="false"
                                                                            checked={updatedArea.withKids === false}
                                                                            onChange={handleRadioChange}
                                                                        />
                                                                        לא
                                                                    </label>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        name="whatsAppLink"
                                                                        value={updatedArea.whatsAppLink || ''}
                                                                        onChange={handleInputChange}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        name="id"
                                                                        value={updatedArea.id}
                                                                        onChange={handleInputChange}
                                                                        className="align-right"
                                                                    />
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td>{area.withKids ? 'כן' : 'לא'}</td>
                                                                <td>{area.whatsAppLink}</td>
                                                                <td>{area.id}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {selectedMenu === 'approveVolunteers' && (
                                    <>
                                        <h3 className="large-margin-bottom" >אישור מתנדבים</h3>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>פעולות</th>
                                                    <th>פרטים</th>
                                                    <th>מס' תעודת זהות</th>
                                                    <th>שם</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {volunteers
                                                    .filter(volunteer => !volunteer.confirmed) // Filter volunteers whose 'confirmed' field is false
                                                    .map(volunteer => (
                                                        <tr key={volunteer.id}>
                                                            <td>
                                                                <button className="action-button" onClick={() => handleApprove(volunteer.id)}>אשר</button>
                                                                <button className="action-button" onClick={() => handleReject(volunteer.id)}>דחה</button>
                                                            </td>
                                                            <td>
                                                                <button className="action-button" onClick={() => handleDetailsClick(volunteer)}>הצג פרטים</button>
                                                            </td>
                                                            <td>{volunteer.id}</td>
                                                            <td>{volunteer.firstName} {volunteer.lastName}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </>
                                )}

                                {selectedMenu === 'addVolunteerArea' && (
                                    <div>
                                        <h3 className="large-margin-bottom">הוספת תחום התנדבות</h3>
                                        <div className="form-group">
                                            <label>:שם</label>
                                            <input
                                                type="text"
                                                name="id"
                                                value={newArea.id}
                                                onChange={handleNewAreaInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>:לינק לוואטסאפ</label>
                                            <input
                                                type="text"
                                                name="whatsAppLink"
                                                value={newArea.whatsAppLink}
                                                onChange={handleNewAreaInputChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            :עם ילדים
                                            <div>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="withKids"
                                                        value="true"
                                                        checked={newArea.withKids === true}
                                                        onChange={handleNewAreaRadioChange}
                                                    />
                                                    כן
                                                </label>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="withKids"
                                                        value="false"
                                                        checked={newArea.withKids === false}
                                                        onChange={handleNewAreaRadioChange}
                                                    />
                                                    לא
                                                </label>
                                            </div>
                                        </div>
                                        <button className="action-button" onClick={handleAddArea}>הוסף</button>
                                    </div>
                                )}
                            </div>
                            <div className="column side">
                                <ul className="menu">
                                    <li onClick={() => setSelectedMenu('editVolunteerAreas')}>עריכת תחומי התנדבות</li>
                                    <li onClick={() => setSelectedMenu('addVolunteerArea')}>הוספת תחום התנדבות</li>
                                    <li onClick={() => setSelectedMenu('approveVolunteers')}>אישור מתנדבים</li>
                                    <li onClick={() => setSelectedMenu('volunteerTable')}>טבלת מתנדבים</li>
                                    <li onClick={() => setSelectedMenu('statistics')}>נתוני המינהל</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="footer">
                        <a href="https://www.levhair.org.il/index.php">חזרה לאתר המינהל</a>
                    </div>
                </div>
            </body>
        </div>
    );
};

export default AdminPage2;

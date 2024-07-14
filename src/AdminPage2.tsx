import React, { useState, useEffect } from 'react';
import './AdminPage2.css';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, updateDoc,writeBatch, doc, setDoc, getDoc} from 'firebase/firestore';
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
	const [newArea, setNewArea] = useState({ id: '', withKids: '', whatsAppLink: '' });
	const [volunteerStats, setVolunteerStats] = useState<{ [key: string]: number }>({});
	const [totalVolunteers, setTotalVolunteers] = useState<number>(0);
	const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);

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

	const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

	const handleDetailsClick = (volunteer: Volunteer) => {
		console.log("Volunteer details clicked: ", volunteer); // בדיקת הקונסולה
		setSelectedVolunteer(volunteer);
	};

	const getPoliceFormUrl = (policeForm: any) => {
		// לוגיקה להמרת הרפרנס ל-URL
		return policeForm.url; // דוגמה, שים כאן את הלוגיקה המתאימה
	};

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
						volunteer.volunteerArea?.forEach(area => {
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

	const fetchVolunteerAreas = async () => {
		const querySnapshot = await getDocs(collection(db, "Volunteer Areas"));
		const areas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		setVolunteerAreas(areas);
	};

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

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setUpdatedArea((prevArea: any) => ({
			...prevArea,
			[name]: value,
		}));
	};

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
	
			// עדכון תחומי ההתנדבות לכל המתנדבים
			const volunteersSnapshot = await getDocs(collection(db, 'Volunteers'));
			const batch = writeBatch(db);
	
			volunteersSnapshot.forEach((doc) => {
				const volunteer = doc.data();
				if (volunteer.volunteerArea && volunteer.volunteerArea.includes(editAreaId)) {
					const updatedVolunteerAreas = volunteer.volunteerArea.map(area =>
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

	const handleNewAreaInputChange = (e) => {
		const { name, value } = e.target;
		setNewArea({ ...newArea, [name]: value });
	};

	const handleNewAreaRadioChange = (e) => {
		setNewArea({ ...newArea, withKids: e.target.value === 'true' });
	};

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
			setNewArea({ id: '', withKids: '', whatsAppLink: '' }); // Reset form
		} catch (error) {
			console.error('Error adding document: ', error);
			setMessage('שגיאה בהוספת תחום התנדבות.');
			setTimeout(() => {
				setMessage(null);
			}, 2500);
		}
	};

    

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
					const pdfURL = URL.createObjectURL(pdfBlob);
					const pdfPath = `C:/BituahLeumiForms/${arr[2]}.pdf`; // עדכן לנתיב המדויק בו נשמר הקובץ
					
					setVolunteers(prevVolunteers => prevVolunteers.map(volunteer =>
						volunteer.id === volunteerId ? { ...volunteer, confirmed: true } : volunteer
					));

					// העלאת הקובץ ל-Firestorage
					setMessage("...המתן, יוצר קובץ ביטוח לאומי");
					const storage = getStorage();
					const storageRef = ref(storage, `BituahLeumiForms/${arr[2]}.pdf`);
					await uploadBytes(storageRef, pdfBlob);
					const downloadURL = await getDownloadURL(storageRef);
	
					// עדכון המתנדב עם URL של ה-PDF
					await updateDoc(doc(db, "Volunteers", volunteerDoc.id), {
						confirmed: true,
						BLform: downloadURL
					});
					console.log("Volunteer confirmed in Firestore.");
					
	
					// שליחת אימייל למתנדב עם הקובץ PDF ולינק לקבוצת הוואטסאפ
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
			console.error("Error in handleApprove:", error);
			setMessage("שגיאה באישור המתנדב.");
			setTimeout(() => {
				setMessage(null);
			}, 2500);
		}
	};
	

	const handleReject = async (volunteerId: string) => {
		try {
			const querySnapshot = await getDocs(collection(db, "Volunteers"));
			const volunteerDoc = querySnapshot.docs.find(doc => doc.data().id === volunteerId);
			if (volunteerDoc) {
				await deleteDoc(doc(db, "Volunteers", volunteerDoc.id));
				setVolunteers(prevVolunteers => prevVolunteers.filter(volunteer => volunteer.id !== volunteerId));
				setMessage("המתנדב נדחה בהצלחה!");
				setTimeout(() => {
					setMessage(null);
				}, 2500);
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
                 onClick={() => setSelectedMenu('statistics')} // הוספת אירוע קליק ללוגו
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
											maintainAspectRatio: false, // אפשרות לעקוף את יחס המידות המקורי
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
											maintainAspectRatio: false, // אפשרות לעקוף את יחס המידות המקורי
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
							<button onClick={exportToExcel}>ייצוא לאקסל</button>
							<table>
								<thead>
									<tr>
										<th>פרטים</th>
										<th>מס' תעודת זהות</th>
										<th>שם</th>
									</tr>
								</thead>
								<tbody>
									{volunteers
										.filter(volunteer => volunteer.confirmed) // סינון המתנדבים שהשדה confirmed שלהם true
										.map(volunteer => (
											<tr key={volunteer.id}>
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
									{volunteerAreas.map(area => (
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
                                        .filter(volunteer => !volunteer.confirmed) // סינון המתנדבים שהשדה confirmed שלהם false
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

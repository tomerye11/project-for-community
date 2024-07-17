import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase'; // Ensure the correct path to your firebase config
import { collection, getDocs, query, addDoc, updateDoc, doc, getDoc, Timestamp, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Registration.css';

const Registration = () => {
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
		// Fetch volunteer areas from Firestore when the component mounts
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

	// Validation functions
	const isValidName = (name: string) => {
		const regex = /^[a-zA-Z\u0590-\u05FF\s]+$/; // Supports Hebrew, English letters and spaces only
		return regex.test(name);
	};

	const isValidId = (id: string) => {
		const regex = /^[0-9]{9}$/; // Checks if ID contains exactly 9 digits
		return regex.test(id);
	};

	const isValidPhone = (phone: string) => {
		const regex = /^05\d{8}$/; // Checks if phone number starts with 05 and has 10 digits
		return regex.test(phone);
	};

	const isValidEmail = (email: string) => {
		const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // Validates email address with English characters only
		return regex.test(email);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value, type, checked, files } = e.target;

		// Perform validations based on input name
		if (name === 'firstName' || name === 'lastName') {
			if (!isValidName(value)) {
				setError('Invalid first or last name.');
			} else {
				setError('');
			}
		}

		if (name === 'id') {
			if (!isValidId(value)) {
				setError('Invalid ID number.');
			} else {
				setError('');
			}
		}

		if (name === 'phone') {
			if (!isValidPhone(value)) {
				setError('Invalid phone number.');
			} else {
				setError('');
			}
		}

		if (name === 'email') {
			if (!isValidEmail(value)) {
				setError('Invalid email address.');
			} else {
				setError('');
			}
		}

		if (type === 'file') {
			const file = files ? files[0] : null;
			if (file && name === 'policeApproval' && file.type !== 'application/pdf') {
				setError('Please upload a PDF file only.');
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

		// Check if the selected volunteer area involves working with kids
		if (name === 'volunteerArea') {
			const selectedArea = volunteerAreas.find(area => area.id === value);
			setWithKids(selectedArea ? selectedArea.withKids : false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form data before submission
		if (!isValidName(formData.firstName)) {
			setError('Invalid first name.');
			return;
		}

		if (!isValidName(formData.lastName)) {
			setError('Invalid last name.');
			return;
		}

		if (!isValidId(formData.id)) {
			setError('Invalid ID number.');
			return;
		}

		if (!isValidPhone(formData.phone)) {
			setError('Invalid phone number.');
			return;
		}

		if (!isValidEmail(formData.email)) {
			setError('Invalid email address.');
			return;
		}

		if (withKids && formData.gender === 'Male' && (!formData.policeApproval || formData.policeApproval.type !== 'application/pdf')) {
			setError('Please upload a PDF file only.');
			return;
		}

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
				alert('!פרטי המתנדב עודכנו בהצלחה');
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
				
				alert('!טופס נשלח בהצלחה');
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
							<label htmlFor="lastName">שם משפחה</label>
							<input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
						</div>
						<div>
							<label htmlFor="firstName">שם פרטי</label>
							<input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
						</div>
					</div>
					<div className="form-row">
						<div>
							<label htmlFor="id">מס' תעודת זהות</label>
							<input type="text" id="id" name="id" value={formData.id} onChange={handleChange} required />
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
						<div className="gender-row">
							<label>מין</label>
							<div className="radio-group">
								<label htmlFor="female">נקבה</label>
								<input type="radio" id="female" name="gender" value="female" onChange={handleChange} required />
								<label htmlFor="male">זכר</label>
								<input type="radio" id="male" name="gender" value="male" onChange={handleChange} required />
							</div>
						</div>
					</div>
					<div className="form-row full-width">
						<div>
							<label htmlFor="volunteer">תחום התנדבות</label>
							<select id="volunteer" name="volunteerArea" value={formData.volunteerArea} onChange={handleChange} required>
								<option value="">בחר תחום התנדבות</option>
								{volunteerAreas.map(area => (
									<option key={area.id} value={area.id}>{area.id}</option>
								))}
							</select>
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
					<button type="submit" disabled={isSubmitDisabled}>שלח טופס</button> {/* Disable submit button if necessary */}
				</form>
			</div>
		</div>
	);
};

export default Registration;

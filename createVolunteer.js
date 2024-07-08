import { db } from './firebaseAdmin.js';

async function createVolunteer() {
    const newVolunteer = {
        id: '111111111',
        firstName: 'test',
        lastName: 'test',
        email: 'twik@gmail.com',
        phone: '0524340796',
        gender: 'F',
        confirmed: false,
        policeForm: null,
        startDate: new Date('2024-07-06T12:17:11Z'),
        volunteerArea: ['area_1']
    };

    try {
        await db.collection('Volunteers').add(newVolunteer);
        console.log('Volunteer created successfully');
    } catch (error) {
        console.error('Error creating volunteer:', error);
    }
}

createVolunteer();

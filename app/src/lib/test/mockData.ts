/**
 * Mock Data for Tests
 * Provides realistic test data for events, participants, and items
 */

export const mockDeviceId = '12345678-1234-4123-8123-123456789012';
export const mockDeviceId2 = '87654321-4321-4321-8321-210987654321';

export const mockEvent = {
	id: 'evt_123',
	name: 'Barbecue chez Nico',
	date: new Date('2026-12-31T18:00:00.000Z'),
	location: '12 rue de la Paix, Paris',
	description: 'Ramenez vos spécialités !',
	hostName: 'Nicolas',
	hostDeviceId: mockDeviceId,
	shareCode: 'ABC123',
	createdAt: new Date('2026-03-20T10:00:00.000Z'),
	updatedAt: new Date('2026-03-20T10:00:00.000Z'),
};

export const mockParticipant = {
	id: 'prt_123',
	eventId: mockEvent.id,
	name: 'Nicolas',
	deviceId: mockDeviceId,
	isHost: true,
	createdAt: new Date('2026-03-20T10:00:00.000Z'),
	updatedAt: new Date('2026-03-20T10:00:00.000Z'),
};

export const mockParticipant2 = {
	id: 'prt_456',
	eventId: mockEvent.id,
	name: 'Marie',
	deviceId: mockDeviceId2,
	isHost: false,
	createdAt: new Date('2026-03-20T10:05:00.000Z'),
	updatedAt: new Date('2026-03-20T10:05:00.000Z'),
};

export const mockItem = {
	id: 'itm_123',
	eventId: mockEvent.id,
	participantId: mockParticipant.id,
	name: 'Pizza',
	category: 'plat',
	quantity: '2',
	createdAt: new Date('2026-03-20T10:10:00.000Z'),
	updatedAt: new Date('2026-03-20T10:10:00.000Z'),
};

export const mockItem2 = {
	id: 'itm_456',
	eventId: mockEvent.id,
	participantId: mockParticipant2.id,
	name: 'Salade',
	category: 'entree',
	quantity: '1',
	createdAt: new Date('2026-03-20T10:15:00.000Z'),
	updatedAt: new Date('2026-03-20T10:15:00.000Z'),
};

export const mockCategories = [
	'apero',
	'entree',
	'plat',
	'dessert',
	'boissons',
	'jeux',
	'autre',
];

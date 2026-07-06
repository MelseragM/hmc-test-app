import { parsePassportText } from './passport.parser';

describe('parsePassportText', () => {
  it('extracts fields from a TD3 passport MRZ', () => {
    const fields = parsePassportText(`
      PASSPORT
      P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
      L898902C36UTO7408122F1204159ZE184226B<<<<<10
    `);

    expect(fields).toEqual(
      expect.objectContaining({
        passportNumber: 'L898902C3',
        issuingCountry: 'UTO',
        nationality: 'UTO',
        surname: 'ERIKSSON',
        givenNames: 'ANNA MARIA',
        dateOfBirth: '1974-08-12',
        sex: 'F',
        expiryDate: '2012-04-15',
      }),
    );
  });

  it('falls back to labeled passport fields when MRZ is missing', () => {
    const fields = parsePassportText(`
      Passport Number: A1234567
      Surname: Smith
      Given Names: John Adam
      Nationality: QATAR
      Date of Birth: 01/02/1985
      Date of Issue: 03 Mar 2020
      Date of Expiry: 03/03/2030
    `);

    expect(fields.passportNumber).toBe('A1234567');
    expect(fields.surname).toBe('Smith');
    expect(fields.givenNames).toBe('John Adam');
    expect(fields.nationality).toBe('QATAR');
    expect(fields.dateOfBirth).toBe('1985-02-01');
    expect(fields.issueDate).toBe('2020-03-03');
    expect(fields.dateOfIssue).toBe('2020-03-03');
    expect(fields.expiryDate).toBe('2030-03-03');
  });

  it('extracts issue and expiry dates from side-by-side passport labels', () => {
    const fields = parsePassportText(`
      Date of Issue
      Date of Expiry
      31/12/2022 30/12/2029
    `);

    expect(fields.issueDate).toBe('2022-12-31');
    expect(fields.dateOfIssue).toBe('2022-12-31');
    expect(fields.expiryDate).toBe('2029-12-30');
  });

  it('extracts Qatar diplomatic passport fields from PaddleOCR text', () => {
    const fields = parsePassportText(`
      Type
      Country code
      4
      Passport N°
      PD
      QAT
      D000000
      -2
      Name
      MOHAMED ALIAHMOHAMED
      th
      Occupation
      DIPLOMATIC ATTACHE
      Date of birth
      Personal N°
      02 07 1979
      27700099999
      Sex
      i
      Place of birth
      5
      QATAR
      上
      M
      Date of issue Jy u Date of expiry
      Hod'igur
      17072013
      16072018
      PDQATMOHAMED<<MOHAMED<ALI<A<H<<<<<<<<<<<<<<<
      D000000<<1QAT7907027M180716927700099999<<<14
    `);

    expect(fields).toEqual(
      expect.objectContaining({
        documentType: 'PD',
        passportNumber: 'D000000',
        countryCode: 'QAT',
        issuingCountry: 'QAT',
        nationality: 'QAT',
        name: 'MOHAMED ALIAHMOHAMED',
        surname: 'MOHAMED',
        givenNames: 'MOHAMED ALI A H',
        occupation: 'DIPLOMATIC ATTACHE',
        personalNumber: '27700099999',
        dateOfBirth: '1979-07-02',
        sex: 'M',
        placeOfBirth: 'QATAR',
        issueDate: '2013-07-17',
        dateOfIssue: '2013-07-17',
        expiryDate: '2018-07-16',
      }),
    );
  });

  it('returns partial fields for ambiguous OCR text', () => {
    const fields = parsePassportText('Passport No: X998877');

    expect(fields).toEqual({
      passportNumber: 'X998877',
      documentType: '',
      countryCode: '',
      issuingCountry: '',
      nationality: '',
      name: '',
      surname: '',
      givenNames: '',
      occupation: '',
      personalNumber: '',
      dateOfBirth: '',
      sex: '',
      placeOfBirth: '',
      issueDate: '',
      dateOfIssue: '',
      expiryDate: '',
    });
  });
});

// Prova isolata della generazione del contratto: verifica che i caratteri
// accentati non facciano fallire pdf-lib e che l'impaginazione regga.
// Uso: node --experimental-strip-types scripts/test-contract-pdf.mts
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { buildContractPdf, type ContractData } from "../src/lib/contract-pdf.ts";

const data: ContractData = {
  activityCode: "V00007",
  fullName: "Michele Morati",
  firstName: "Michele",
  lastName: "Morati",
  email: "micmech90@gmail.com",
  phone: "+39 3486724359",
  taxId: "MRTMHL90T01E349E",
  companyName: null,
  address: "Via Città di Nizza 12, 37100 Verona, Veneto, Italia",
  birthDate: "01 dicembre 1990",
  birthPlace: "Verona",
  birthProvince: "VR",
  citizenship: "Italiana",
  profession: "Imprenditore",
  documentType: "Carta d'identità",
  documentNumber: "CA12345AB",
  sponsor: "V0000A green-mind-group",
  bankName: "Intesa Sanpaolo",
  bankHolder: "Michele Morati",
  iban: "IT60X0542811101000000123456",
  swift: "BCITITMM",
  declEarnedThreshold: false,
  declUnemployed: false,
  declSocialSecurity: true,
  declPensioner: false,
  declHasVat: true,
  declVatRegime: "Regime forfettario",
  declPublicEmployee: true,
  declPublicFullTime: false,
  signingPlace: "Verona",
  contractVersion: "IVD-2026-08",
  signedAt: "1 settembre 2026, 11:20",
  signedIp: "203.0.113.7",
};

const originalPath = process.argv[2];
const original =
  originalPath && existsSync(originalPath) ? new Uint8Array(readFileSync(originalPath)) : null;

const firmato = await buildContractPdf(data, original);
writeFileSync("/tmp/contratto-firmato.pdf", firmato);

const bozza = await buildContractPdf({ ...data, signedAt: null, signedIp: null }, original);
writeFileSync("/tmp/contratto-bozza.pdf", bozza);

console.log("firmato:", firmato.length, "byte");
console.log("bozza:  ", bozza.length, "byte");
console.log("contratto originale accodato:", original ? "sì" : "no");

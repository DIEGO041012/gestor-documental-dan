// ── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://iwbxedqhuswsgjsfwppe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YnhlZHFodXN3c2dqc2Z3cHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NzAwNzYsImV4cCI6MjA5ODQ0NjA3Nn0.7Sz-tRqT0AT5tKGW-_MeqvnbGp9adcG34dSNfKiWlwg';
const CLOUD_NAME = 'diuaog5qb';
const UPLOAD_PRESET = 'gestor-documental-dam';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── STATE ──────────────────────────────────────────────────────────────────
let currentSection = 'dashboard';
let gestionTab = 'activos';
let importTab = 'activos';
let importRows = [];
let currentModal = null;
let editingId = null;
let uploadedFotoUrl = null;
let bajaRecordData = null;
let radicadosPage = 0;
const RADICADOS_PAGE_SIZE = 50;
let radicadosTotal = 0;


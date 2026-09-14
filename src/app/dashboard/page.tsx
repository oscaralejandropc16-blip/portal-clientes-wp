"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LogOut, FileText, Download, Calendar, Loader2, AlertCircle,
  Building2, UploadCloud, X, CheckCircle2, FolderLock, Search,
  Edit2, Trash2, ChevronDown, User, History, Clock, FolderMinus, Pencil
} from "lucide-react";

// Interfaces
interface Expediente {
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  acf?: {
    documento_pdf?: string;
  };
  empresa?: number[];
}

interface Empresa {
  id: number;
  name: string;
}

interface ActivityLog {
  id: string;
  action: 'Crear' | 'Editar' | 'Eliminar';
  itemType: 'Cliente' | 'Expediente';
  itemName: string;
  userName: string;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Usuario");
  
  // Datos
  const [documents, setDocuments] = useState<Expediente[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]); 
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin simulado
  const [isAdmin] = useState(true);

  // Modales Principales
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Modales CRUD
  const [docToEdit, setDocToEdit] = useState<Expediente | null>(null);
  const [docToDelete, setDocToDelete] = useState<Expediente | null>(null);
  const [companyToEdit, setCompanyToEdit] = useState<Empresa | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Empresa | null>(null);

  // Estado de Descarga
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Estados Formularios
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docCompany, setDocCompany] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [editDocTitle, setEditDocTitle] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estado de error genérico para acciones CRUD secundarias
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Estado para alertas de bloqueo premium
  const [blockAlert, setBlockAlert] = useState<string | null>(null);

  const clearActionState = () => {
    setDocToEdit(null);
    setDocToDelete(null);
    setCompanyToEdit(null);
    setCompanyToDelete(null);
    setActionError(null);
  };

  const addLog = (action: ActivityLog['action'], itemType: ActivityLog['itemType'], itemName: string, customUser?: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      action,
      itemType,
      itemName,
      userName: customUser || userName,
      timestamp: new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
    };
    
    setActivityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50); // Guardar máximo 50
      localStorage.setItem("portal_activity_logs", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    let currentUserName = "Usuario";
    const storedUser = localStorage.getItem("wp_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.display_name) {
          currentUserName = parsed.display_name;
          setUserName(parsed.display_name);
        }
      } catch (e) {
        console.error("Error al leer datos del usuario", e);
      }
    }

    const storedLogs = localStorage.getItem("portal_activity_logs");
    if (storedLogs) {
      try {
        setActivityLogs(JSON.parse(storedLogs));
      } catch(e) {}
    }

    const fetchInitialData = async () => {
      // 1. Carga Optimista Instantánea (Caché local)
      const cachedData = localStorage.getItem("portal_cached_data");
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.documents) setDocuments(parsed.documents.filter((d: any) => !d.title.rendered.includes("__DELETED__")));
          if (parsed.companies) setCompanies(parsed.companies.filter((c: any) => !c.name.includes("__DELETED__")));
          setIsLoading(false); // Quitar loader si hay caché para carga instantánea
        } catch(e) {}
      } else {
        setIsLoading(true);
      }
      
      setError(null);
      
      try {
        const token = localStorage.getItem("wp_token");
        if (!token) throw new Error("No hay token de sesión. Por favor, inicia sesión de nuevo.");

        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        };

        const [expRes, empRes] = await Promise.all([
          fetch("https://romanydelgado.com/wp-json/wp/v2/expedientes?per_page=100", { method: "GET", headers }),
          fetch("https://romanydelgado.com/wp-json/wp/v2/empresa?per_page=100", { method: "GET", headers })
        ]);

        if (!expRes.ok) throw new Error("No se pudieron cargar los expedientes.");
        const expData: Expediente[] = await expRes.json();
        
        let empData: Empresa[] = [];
        if (empRes.ok) {
          empData = await empRes.json();
        }

        // Actualizamos estado en segundo plano
        setDocuments(expData.filter(d => !d.title.rendered.includes("__DELETED__")));
        setCompanies(empData.filter(c => !c.name.includes("__DELETED__")));

        // Guardamos caché fresco para la próxima visita
        localStorage.setItem("portal_cached_data", JSON.stringify({ documents: expData, companies: empData }));

      } catch (err: any) {
        if (!cachedData) setError(err.message || "Ocurrió un error inesperado al conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wp_token");
    localStorage.removeItem("wp_user");
    document.cookie = "wp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const filteredDocuments = documents.filter(doc => {
    const companyMatch = selectedCompanyId === null || (doc.empresa && doc.empresa.includes(selectedCompanyId));
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = doc.title.rendered.toLowerCase().includes(searchLower);
    const dateMatch = formatDate(doc.date).toLowerCase().includes(searchLower);
    const textMatch = titleMatch || dateMatch;
    return companyMatch && textMatch;
  });

  // --- LÓGICA: CREAR CLIENTE (EMPRESA/PERSONA) ---
  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setCompanyError("El nombre es obligatorio.");
      return;
    }

    setIsCreatingCompany(true);
    setCompanyError(null);
    setCompanySuccess(null);

    try {
      const token = localStorage.getItem("wp_token");
      if (!token) throw new Error("Sesión expirada");

      const response = await fetch("https://romanydelgado.com/wp-json/wp/v2/empresa", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Error al registrar el cliente en el servidor.");

      setCompanySuccess(`Cliente "${data.name}" agregado con éxito.`);
      setCompanies(prev => [...prev, { id: data.id, name: data.name }]);
      addLog('Crear', 'Cliente', data.name);

      setTimeout(() => {
        setIsCompanyModalOpen(false);
        setNewCompanyName("");
        setCompanySuccess(null);
      }, 1500);
    } catch (err: any) {
      setCompanyError(err.message || "Ocurrió un problema de conexión.");
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // --- LÓGICA: EDITAR CLIENTE ---
  const handleEditCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyToEdit || !editCompanyName.trim()) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("wp_token");
      const response = await fetch(`https://romanydelgado.com/wp-json/wp/v2/empresa/${companyToEdit.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ name: editCompanyName.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al modificar el cliente en el servidor.");
      }
      const updatedEmp = await response.json();
      
      setCompanies(prev => prev.map(c => c.id === updatedEmp.id ? { ...c, name: updatedEmp.name } : c));
      addLog('Editar', 'Cliente', updatedEmp.name);
      clearActionState();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA: ELIMINAR CLIENTE ---
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("wp_token");
      // Truco anti-firewall: En vez de un DELETE que el host bloquea, 
      // renombramos la empresa a __DELETED__ usando un POST normal y la ocultamos.
      const response = await fetch(`https://romanydelgado.com/wp-json/wp/v2/empresa/${companyToDelete.id}`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ name: `__DELETED__${companyToDelete.id}` })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar. Verifica tus permisos de Administrador.");
      }
      
      setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
      addLog('Eliminar', 'Cliente', companyToDelete.name);
      if (selectedCompanyId === companyToDelete.id) {
        setSelectedCompanyId(null);
      }
      clearActionState();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA: SUBIR DOCUMENTO (A y B) ---
  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFile || !docCompany) {
      setDocError("Por favor completa todos los campos.");
      return;
    }

    setIsUploadingDoc(true);
    setUploadProgress(0);
    setDocError(null);
    setDocSuccess(null);

    try {
      const token = localStorage.getItem("wp_token");
      if (!token) throw new Error("Sesión expirada");

      // Paso 1: Subir el archivo multimedia usando XMLHttpRequest para progreso (usando FormData para evitar problemas de CORS)
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("title", docTitle.trim());

      const mediaData: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://romanydelgado.com/wp-json/wp/v2/media", true);
        
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Accept", "application/json");
        // Nota: NO seteamos Content-Type ni Content-Disposition manualmente para evitar que el CORS bloquee la petición.

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Respuesta inválida del servidor (HTML en lugar de JSON)."));
            }
          } else {
            let errorMsg = `Error ${xhr.status}: Falló la subida del archivo.`;
            if (xhr.status === 413) errorMsg = "El archivo es demasiado grande para el servidor.";
            try {
              const err = JSON.parse(xhr.responseText);
              errorMsg = err.message || errorMsg;
            } catch(e) {}
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Error de red al intentar subir el archivo (CORS o pérdida de conexión)."));
        };

        xhr.send(formData); // Envío usando FormData
      });

      const uploadedMediaId = mediaData.id;

      setUploadProgress(100); // Completado el paso 1

      // Paso 2: Crear el expediente y vincularlo
      const expBody: any = {
        title: docTitle.trim(),
        status: "publish",
        acf: { documento_pdf: uploadedMediaId }
      };

      if (docCompany) {
        expBody.empresa = [parseInt(docCompany)]; 
      }

      const expResponse = await fetch("https://romanydelgado.com/wp-json/wp/v2/expedientes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(expBody),
      });

      const expData = await expResponse.json();

      if (!expResponse.ok) throw new Error(expData.message || "Error en el Paso 2: Falló la creación del expediente.");

      setDocSuccess(`El expediente "${expData.title.rendered}" fue subido correctamente.`);
      setDocuments(prev => [expData, ...prev]);
      addLog('Crear', 'Expediente', expData.title.rendered);

      setTimeout(() => {
        setIsDocModalOpen(false);
        setDocTitle("");
        setDocCompany("");
        setDocFile(null);
        setDocSuccess(null);
      }, 2000);

    } catch (err: any) {
      setDocError(err.message || "Error de conexión al subir el documento.");
    } finally {
      setIsUploadingDoc(false);
      setUploadProgress(0);
    }
  };

  // --- LÓGICA: EDITAR DOCUMENTO ---
  const handleEditDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!docToEdit || !editDocTitle.trim()) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("wp_token");
      const response = await fetch(`https://romanydelgado.com/wp-json/wp/v2/expedientes/${docToEdit.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ title: editDocTitle.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al modificar el documento.");
      }
      const updatedDoc = await response.json();
      
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      addLog('Editar', 'Expediente', editDocTitle.trim());
      clearActionState();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA: ELIMINAR DOCUMENTO ---
  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("wp_token");
      // Truco anti-firewall: Renombramos el documento a __DELETED__ y 
      // lo desligamos de la empresa usando un POST normal.
      const response = await fetch(`https://romanydelgado.com/wp-json/wp/v2/expedientes/${docToDelete.id}`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ title: `__DELETED__${docToDelete.id}`, empresa: [] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar el documento.");
      }
      
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
      addLog('Eliminar', 'Expediente', docToDelete.title.rendered);
      clearActionState();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA: DESCARGAR DOCUMENTO (RESOLVER IDs ACF) ---
  const handleDownload = async (documentoPdfValue: any) => {
    // Si ya es una URL completa, abrirla directamente
    if (typeof documentoPdfValue === 'string' && documentoPdfValue.startsWith('http')) {
      window.open(documentoPdfValue, '_blank', 'noopener,noreferrer');
      return;
    }

    // Si es un ID numérico (ej. 7316), necesitamos buscar su URL real en WordPress
    const mediaId = parseInt(documentoPdfValue, 10);
    if (isNaN(mediaId)) {
      setBlockAlert("El enlace del archivo no es válido o está corrupto.");
      return;
    }

    setDownloadingId(mediaId);
    try {
      const response = await fetch(`https://romanydelgado.com/wp-json/wp/v2/media/${mediaId}`);
      if (!response.ok) throw new Error("No se pudo localizar el archivo físico.");
      
      const data = await response.json();
      if (data.source_url) {
        window.open(data.source_url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error("El servidor no devolvió una ruta válida para este archivo.");
      }
    } catch (err: any) {
      setBlockAlert(err.message || "Error al intentar descargar el archivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* --- Ambient Background Premium (Optimizado) --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/login-bg.png')] bg-cover bg-center opacity-[0.04]" />
      </div>

      {/* --- Navbar Flotante --- */}
      <nav className="relative z-10 pt-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-[#1a1a24]/80 border border-white/5 rounded-full px-4 py-3 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-lg shadow-black/40">
              <Image
                src="/logo-emblem.png"
                alt="Román y Delgado"
                width={30}
                height={30}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg text-white tracking-tight leading-tight">Intranet Legal</span>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase hidden sm:block">Román y Delgado</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300 group"
              title="Historial de Actividad"
            >
              <History className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
              <span className="hidden sm:block">Actividad</span>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-red-500/10 rounded-full transition-all duration-300 group"
            >
              <span className="hidden sm:block">Cerrar Sesión</span>
              <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        
        {/* Header Hero */}
        <div className="text-center sm:text-left animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tight mb-4">
            Bienvenido, {userName}
          </h1>
          <p className="text-lg text-zinc-400/80 max-w-2xl mx-auto sm:mx-0">
            Intercambia expedientes y documentación de casos con el equipo de forma centralizada y segura.
          </p>
        </div>

        {/* Panel Bento Grid de Administración */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-bottom-6 duration-700 delay-150">
            <button 
              onClick={() => setIsCompanyModalOpen(true)}
              className="group relative overflow-hidden bg-[#1a1a24] border border-white/5 hover:border-indigo-500/30 rounded-3xl p-6 text-left transition-all hover:bg-[#20202c] shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Nueva Carpeta</h3>
                <p className="text-sm text-zinc-400">Crea un espacio para un nuevo caso o cliente.</p>
              </div>
            </button>

            <button 
              onClick={() => setIsDocModalOpen(true)}
              className="group relative overflow-hidden bg-[#1a1a24] border border-white/5 hover:border-orange-500/30 rounded-3xl p-6 text-left transition-all hover:bg-[#20202c] shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5 text-orange-400 group-hover:scale-110 transition-transform shadow-inner">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Subir Documento</h3>
                <p className="text-sm text-zinc-400">Publica un nuevo expediente PDF en segundos.</p>
              </div>
            </button>
          </div>
        )}

        {/* --- Filtro por Empresas (Carpetas) --- */}
        {companies.length > 0 && (
          <div className="animate-in slide-in-from-bottom-7 duration-700 delay-200">
            <h2 className="text-xl font-bold text-white mb-4 px-2">Directorio de Casos y Clientes</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 px-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
              
              <button
                onClick={() => setSelectedCompanyId(null)}
                className={`snap-start shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 border ${
                  selectedCompanyId === null 
                    ? "bg-white text-zinc-900 border-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.4)]" 
                    : "bg-[#1a1a24] text-zinc-400 border-white/5 hover:bg-[#20202c]"
                }`}
              >
                Todos los Archivos
              </button>
              
              {companies.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedCompanyId(emp.id)}
                  className={`snap-start shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 border flex items-center gap-2 ${
                    selectedCompanyId === emp.id 
                      ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]" 
                      : "bg-[#1a1a24] text-zinc-400 border-white/5 hover:bg-[#20202c]"
                  }`}
                >
                  <User className="w-4 h-4 opacity-80" />
                  <span dangerouslySetInnerHTML={{ __html: emp.name }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- Lista de Documentos (Grid Pro Max) --- */}
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-300">
          
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {selectedCompanyId ? (
                    <>
                      <User className="w-6 h-6 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs" dangerouslySetInnerHTML={{ __html: companies.find(c => c.id === selectedCompanyId)?.name || "" }} />
                    </>
                  ) : "Archivos Recientes"}
                </h2>
                <span className="px-3 py-1 bg-white/5 text-zinc-400 text-xs font-semibold rounded-full border border-white/10 shrink-0">
                  {filteredDocuments.length}
                </span>
              </div>
              
              {/* Controles CRUD para la Empresa Seleccionada */}
              {isAdmin && selectedCompanyId && (
                <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-4 mt-2 sm:mt-0">
                  <button 
                    onClick={() => {
                      const emp = companies.find(c => c.id === selectedCompanyId);
                      if (emp) { setCompanyToEdit(emp); setEditCompanyName(emp.name); setActionError(null); }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20 text-xs font-semibold"
                    title="Renombrar Carpeta"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Renombrar
                  </button>
                  <button 
                    onClick={() => {
                      const emp = companies.find(c => c.id === selectedCompanyId);
                      if (emp) {
                        const hasDocs = documents.some(doc => doc.empresa && doc.empresa.includes(emp.id));
                        if (hasDocs) {
                          setBlockAlert("No puedes eliminar esta carpeta porque aún tiene expedientes asignados. Debes eliminar o reasignar los expedientes primero.");
                        } else {
                          setCompanyToDelete(emp);
                          setActionError(null);
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 text-xs font-semibold"
                    title="Eliminar Carpeta"
                  >
                    <FolderMinus className="w-3.5 h-3.5" />
                    Eliminar Carpeta
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative w-full md:w-80 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar documento o fecha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a24] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center bg-white/[0.01] border border-white/5 rounded-3xl backdrop-blur-sm">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-zinc-400 font-medium tracking-wide">Sincronizando la nube...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/[0.01] border border-white/5 rounded-3xl">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4 opacity-80" />
              <p className="text-red-200 font-medium mb-2">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/[0.01] border border-white/5 rounded-3xl">
              <FileText className="w-14 h-14 text-zinc-600/50 mb-4" />
              <p className="text-zinc-300 font-medium text-lg">Tu espacio está vacío</p>
              <p className="text-zinc-500 text-sm mt-1">No hay expedientes asociados a esta cuenta aún.</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/[0.01] border border-white/5 rounded-3xl">
              <Search className="w-14 h-14 text-zinc-600/50 mb-4" />
              <p className="text-zinc-300 font-medium text-lg">No se encontraron coincidencias</p>
              <p className="text-zinc-500 text-sm mt-1">Intenta buscar con otros términos o en otra carpeta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocuments.map((doc) => {
                const downloadLink = doc.acf?.documento_pdf || null;

                return (
                  <div key={doc.id} className="group relative bg-[#1a1a24] hover:bg-[#20202c] border border-white/5 hover:border-blue-500/20 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between min-h-[220px] shadow-xl">
                    
                    {/* Botones de Acción Rápida (Edición/Eliminación) - Visibles en móvil, Hover en Desktop */}
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setDocToEdit(doc); setEditDocTitle(doc.title.rendered); setActionError(null); }}
                          className="p-1.5 bg-[#0a0a0d] hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-lg transition-colors border border-white/5 shadow-md"
                          title="Editar Título"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setDocToDelete(doc); setActionError(null); }}
                          className="p-1.5 bg-[#0a0a0d] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors border border-white/5 shadow-md"
                          title="Eliminar Expediente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                    
                    <div className="relative z-10 pr-16">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 shadow-inner">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 
                        className="text-lg font-bold text-zinc-100 leading-tight mb-2 line-clamp-2" 
                        dangerouslySetInnerHTML={{ __html: doc.title.rendered }} 
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-6">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(doc.date)}
                      </div>
                    </div>

                    <div className="relative z-10 mt-auto">
                      {downloadLink ? (
                        <button 
                          onClick={() => handleDownload(downloadLink)}
                          disabled={downloadingId === parseInt(downloadLink as string, 10)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 font-semibold text-sm transition-colors group/btn shadow-inner disabled:opacity-50"
                        >
                          {downloadingId === parseInt(downloadLink as string, 10) ? 'Obteniendo archivo...' : 'Descargar Archivo'}
                          {downloadingId === parseInt(downloadLink as string, 10) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                          )}
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center px-4 py-3 bg-white/5 rounded-xl text-zinc-500 font-semibold text-sm border border-transparent">
                          No disponible
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODALES PREMIUM
          ======================================================== */}
      
      {/* 1. Modal: Crear Empresa */}
      {isCompanyModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isCreatingCompany && (setIsCompanyModalOpen(false), setCompanyError(null), setCompanySuccess(null), setNewCompanyName(""))}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <button 
              onClick={() => { setIsCompanyModalOpen(false); setCompanyError(null); setCompanySuccess(null); setNewCompanyName(""); }} 
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
              disabled={isCreatingCompany}
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
            
            <h3 className="text-2xl font-extrabold text-white mb-8 flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400"><User className="w-6 h-6" /></div>
              Crear Nueva Carpeta
            </h3>

            {companyError && <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{companyError}</p></div>}
            {companySuccess && <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl relative z-10"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><p className="text-sm text-emerald-200 font-medium">{companySuccess}</p></div>}
            
            <form onSubmit={handleCreateCompany} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Nombre (Caso o Cliente)</label>
                <input type="text" required value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} disabled={isCreatingCompany} placeholder="Ej. Demanda Sol Cargo o Pedro Pérez" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50 shadow-inner" />
              </div>
              <button type="submit" disabled={isCreatingCompany} className="w-full flex justify-center items-center gap-2 mt-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(79,70,229,0.4)] disabled:opacity-50">
                {isCreatingCompany ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
                {isCreatingCompany ? "Guardando..." : "Confirmar y Guardar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Subir Documento (Rediseñado con Custom Dropdown) */}
      {isDocModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isUploadingDoc && (setIsDocModalOpen(false), setDocError(null), setDocSuccess(null), setDocTitle(""), setDocCompany(""), setDocFile(null), setIsDropdownOpen(false))}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-6 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300 overflow-visible cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <button 
              onClick={() => { setIsDocModalOpen(false); setDocError(null); setDocSuccess(null); setDocTitle(""); setDocCompany(""); setDocFile(null); setIsDropdownOpen(false); }} 
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
              disabled={isUploadingDoc}
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
            
            <h3 className="text-2xl font-extrabold text-white mb-8 flex items-center gap-3 relative z-10">
               <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400"><UploadCloud className="w-6 h-6" /></div>
               Subir Documento
            </h3>

            {docError && <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{docError}</p></div>}
            {docSuccess && <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl relative z-10"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><p className="text-sm text-emerald-200 font-medium">{docSuccess}</p></div>}
            
            <form onSubmit={handleUploadDocument} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Título del Documento</label>
                <input type="text" required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} disabled={isUploadingDoc} placeholder="Ej. Reporte Financiero Anual" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50 shadow-inner" />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Carpeta / Cliente Asignado</label>
                {/* Custom Select Premium */}
                <div 
                  onClick={() => !isUploadingDoc && setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full bg-black/40 border ${isDropdownOpen ? 'border-orange-500/50 ring-2 ring-orange-500/20' : 'border-white/10 hover:border-white/20'} rounded-2xl px-5 py-4 text-white transition-all shadow-inner flex justify-between items-center cursor-pointer ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={docCompany ? "text-white font-medium" : "text-zinc-500"}>
                    {docCompany ? companies.find(c => c.id.toString() === docCompany)?.name : "Selecciona a qué caso pertenece..."}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-orange-400' : ''}`} />
                </div>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {companies.length === 0 ? (
                         <div className="px-5 py-4 text-zinc-500 text-sm text-center">No hay clientes creados.</div>
                      ) : (
                        companies.map(emp => (
                          <div 
                            key={emp.id}
                            onClick={() => { setDocCompany(emp.id.toString()); setIsDropdownOpen(false); }}
                            className={`px-5 py-3.5 cursor-pointer transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group ${docCompany === emp.id.toString() ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                          >
                            <span className={`font-medium ${docCompany === emp.id.toString() ? 'text-orange-400' : 'text-zinc-300 group-hover:text-white'}`} dangerouslySetInnerHTML={{ __html: emp.name }} />
                            {docCompany === emp.id.toString() && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Archivo Original (PDF)</label>
                <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 group ${docFile ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_30px_-5px_rgba(249,115,22,0.15)]' : 'border-white/10 hover:bg-white/[0.03] hover:border-orange-500/40 bg-black/40'}`}>
                  <input type="file" accept=".pdf" required disabled={isUploadingDoc} onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                  <UploadCloud className={`w-12 h-12 mx-auto mb-3 transition-all duration-300 ${docFile ? 'text-orange-400 scale-110' : 'text-zinc-600 group-hover:text-orange-400 group-hover:-translate-y-1'}`} />
                  <p className="text-sm text-zinc-200 font-medium truncate px-4">{docFile ? docFile.name : "Arrastra el PDF aquí o haz clic"}</p>
                  {!docFile && <p className="text-xs text-zinc-600 font-medium mt-2">Límite según el servidor (Solo PDF)</p>}
                </div>
              </div>
              <button type="submit" disabled={isUploadingDoc} className="w-full relative overflow-hidden flex justify-center items-center gap-2 mt-4 py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)] disabled:opacity-50">
                {/* Progress bar background */}
                {isUploadingDoc && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  {isUploadingDoc ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                  {isUploadingDoc ? `Subiendo... ${uploadProgress}%` : "Subir y Crear Expediente"}
                </div>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALES DE ADMINISTRACIÓN (EDITAR/ELIMINAR)
          ======================================================== */}

      {/* 3. Modal: Editar Cliente */}
      {companyToEdit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isProcessing && clearActionState()}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <button 
              onClick={() => clearActionState()} 
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
              disabled={isProcessing}
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
            
            <h3 className="text-2xl font-extrabold text-white mb-8 flex items-center gap-3 relative z-10"><div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400"><Edit2 className="w-6 h-6" /></div>Editar Nombre de Carpeta</h3>
            
            {actionError && <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{actionError}</p></div>}
            
            <form onSubmit={handleEditCompany} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Nuevo Nombre</label>
                <input type="text" required value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} disabled={isProcessing} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50 shadow-inner" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full flex justify-center items-center gap-2 mt-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(79,70,229,0.4)] disabled:opacity-50">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Eliminar Cliente */}
      {companyToDelete && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isProcessing && clearActionState()}
        >
          <div 
            className="bg-[#0f0f13] border border-red-500/20 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(220,38,38,0.2)] relative animate-in zoom-in-95 duration-300 text-center overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
             
             <button 
               onClick={() => clearActionState()} 
               className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
               disabled={isProcessing}
             >
               <X className="w-5 h-5 pointer-events-none" />
             </button>

             <div className="relative z-10">
               <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                 <AlertCircle className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-extrabold text-white mb-3">Eliminar Carpeta</h3>
               
               {actionError && <div className="mb-6 flex items-start text-left gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{actionError}</p></div>}
               
               <p className="text-zinc-400 text-base mb-8">
                 ¿Estás seguro de que deseas eliminar permanentemente esta carpeta: <b className="text-white" dangerouslySetInnerHTML={{ __html: companyToDelete.name }} />? Esta acción no se puede deshacer.
               </p>
               <div className="flex gap-4">
                 <button onClick={() => clearActionState()} disabled={isProcessing} className="flex-1 py-4 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all disabled:opacity-50">Cancelar</button>
                 <button onClick={handleDeleteCompany} disabled={isProcessing} className="flex-1 py-4 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-2">
                   {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                   Eliminar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Editar Documento */}
      {docToEdit && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isProcessing && clearActionState()}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <button 
              onClick={() => clearActionState()} 
              className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
              disabled={isProcessing}
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
            
            <h3 className="text-2xl font-extrabold text-white mb-8 flex items-center gap-3 relative z-10"><div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400"><Edit2 className="w-6 h-6" /></div>Renombrar Documento</h3>
            
            {actionError && <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{actionError}</p></div>}
            
            <form onSubmit={handleEditDocument} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-2">Nuevo Título</label>
                <input type="text" required value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} disabled={isProcessing} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 shadow-inner" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full flex justify-center items-center gap-2 mt-2 py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] disabled:opacity-50">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Eliminar Documento */}
      {docToDelete && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => !isProcessing && clearActionState()}
        >
          <div 
            className="bg-[#0f0f13] border border-red-500/20 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(220,38,38,0.2)] relative animate-in zoom-in-95 duration-300 text-center overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
             
             <button 
               onClick={() => clearActionState()} 
               className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
               disabled={isProcessing}
             >
               <X className="w-5 h-5 pointer-events-none" />
             </button>

             <div className="relative z-10">
               <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                 <AlertCircle className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-extrabold text-white mb-3">Eliminar Documento</h3>
               
               {actionError && <div className="mb-6 flex items-start text-left gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-sm text-red-200">{actionError}</p></div>}
               
               <p className="text-zinc-400 text-base mb-8">
                 ¿Estás seguro de que deseas eliminar permanentemente el archivo <b className="text-white" dangerouslySetInnerHTML={{ __html: docToDelete.title.rendered }} />? Esta acción no se puede deshacer.
               </p>
               <div className="flex gap-4">
                 <button onClick={() => clearActionState()} disabled={isProcessing} className="flex-1 py-4 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all disabled:opacity-50">Cancelar</button>
                 <button onClick={handleDeleteDocument} disabled={isProcessing} className="flex-1 py-4 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-2">
                   {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                   Eliminar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Bloqueo de Seguridad Premium */}
      {blockAlert && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
          onClick={() => setBlockAlert(null)}
        >
          <div 
            className="bg-[#0f0f13] border border-amber-500/20 rounded-[2rem] p-6 md:p-10 w-full max-w-md shadow-[0_0_50px_-12px_rgba(245,158,11,0.2)] relative animate-in zoom-in-95 duration-300 text-center overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
             
             <button 
               onClick={() => setBlockAlert(null)} 
               className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all z-50 cursor-pointer" 
             >
               <X className="w-5 h-5 pointer-events-none" />
             </button>

             <div className="relative z-10">
               <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                 <FolderLock className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-extrabold text-white mb-4">Bloqueo de Seguridad</h3>
               
               <p className="text-zinc-300 text-base mb-8 leading-relaxed">
                 {blockAlert}
               </p>
               <button onClick={() => setBlockAlert(null)} className="w-full py-4 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]">
                 Entendido
               </button>
             </div>
          </div>
        </div>
      )}

      {/* 8. Slide-over Modal: Historial de Actividad */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 animate-in fade-in duration-300">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsHistoryOpen(false)}></div>
          
          <div className="relative w-full max-w-sm h-full bg-[#0a0a0d] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Historial de Actividad
              </h3>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center gap-3">
                  <Clock className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Aún no hay actividad registrada.</p>
                </div>
              ) : (
                activityLogs.map(log => (
                  <div key={log.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex gap-3">
                    <div className="mt-1">
                      {log.action === 'Crear' && <UploadCloud className="w-4 h-4 text-emerald-400" />}
                      {log.action === 'Editar' && <Edit2 className="w-4 h-4 text-blue-400" />}
                      {log.action === 'Eliminar' && <Trash2 className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        El usuario <span className="text-white font-semibold">{log.userName}</span>{' '}
                        {log.action.toLowerCase()} el {log.itemType.toLowerCase()}:{' '}
                        <span className="text-white font-medium" dangerouslySetInnerHTML={{ __html: log.itemName }}></span>
                      </p>
                      <span className="text-xs text-zinc-500 mt-2 block">{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// src/utils/dateHelpers.ts

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (hora local)
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la hora actual en formato HH:MM (hora local)
 */
export const getTimeLocal = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

/**
 * Formatea una fecha para mostrar en la UI
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    // Dividir la fecha en partes para evitar problemas de zona horaria
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Formatea una fecha para mostrar en formato corto
 */
export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export type AppMode = 'BUSINESS' | 'TALENT';

export interface AccountProfile {
  id: string;
  userId: string;
  nama: string;
  createdAt: any;
  appMode: AppMode;
}

export interface UserPermission {
  email: string;
  allowedModes: AppMode[];
  role: 'ADMIN' | 'USER' | 'TALENT_STAFF' | 'BUSINESS_STAFF';
}

export interface Shop {
  id: string;
  nama: string;
  linkToko: string;
  asalToko: string;
  awalPromosi: string;
  userId: string;
  profileId: string;
  createdAt?: any;
}

export interface Product {
  id: string;
  namaProduk: string;
  kategori: string;
  namaTokoId: string;
  namaToko: string;
  linkProduk?: string;
  hargaJual: number;
  fotoProduk?: string;
  userId: string;
  profileId: string;
}

export interface Sale {
  id: string;
  userId: string;
  profileId: string;
  tokoId: string;
  namaToko: string;
  produkId: string;
  namaProduk: string;
  jumlah: number;
  totalOmset: number;
  tanggal: any;
  createdAt?: any;
}

export interface ContentRecord {
  id: string;
  userId: string;
  profileId: string;
  tokoId: string;
  namaToko: string;
  produkId: string;
  namaProduk: string;
  linkKonten: string;
  tanggal: any;
}

export interface ContentTarget {
  id: string;
  userId: string;
  profileId: string;
  judul: string;
  isDone: boolean;
  tanggalTarget: string;
  createdAt: any;
}

export interface Talent {
  id: string;
  nama: string;
  namaAkun: string[];
  kontak: string;
  status: 'AKTIF' | 'NONAKTIF';
  profileId: string;
  projectId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Employee {
  id: string;
  nama: string;
  nomorHp: string;
  tanggalMasuk: string;
  posisi: string;
  lokasiKantor: string;
  status: 'AKTIF' | 'RESIGN';
  profileId: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  status: 'HADIR' | 'SAKIT' | 'ALPA' | 'IZIN';
  keterangan: string;
  tanggal: any;
  profileId: string;
  namaKaryawan: string;
  jabatan: string;
  foto?: string;
  lokasi?: { latitude: number, longitude: number } | null;
}

export interface OfficeLocation {
  id: string;
  namaKantor: string;
  alamat: string;
  profileId: string;
  createdAt?: any;
}

export interface Holiday {
  id: string;
  tanggal: string;
  keterangan: string;
  profileId: string;
}

export type ViewState = 
  | 'DASHBOARD' 
  | 'TOKO' 
  | 'PRODUK' 
  | 'PENJUALAN' 
  | 'KONTEN' 
  | 'INSIGHTS' 
  | 'TARGET' 
  | 'REPORTS'
  | 'TALENT_LIST'
  | 'TALENT_REPORTS'
  | 'TALENT_CONTENT'
  | 'TALENT_PRODUCTION'
  | 'TALENT_KPI'
  | 'TALENT_DASHBOARD'
  | 'KARYAWAN_DASHBOARD'
  | 'KARYAWAN_LIST'
  | 'KARYAWAN_ABSENSI'
  | 'KARYAWAN_LOKASI';

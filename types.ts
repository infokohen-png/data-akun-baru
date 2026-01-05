
export type AppMode = 'BUSINESS' | 'TALENT';

export interface AccountProfile {
  id: string;
  userId: string;
  nama: string;
  createdAt: any;
  appMode: AppMode; // Membedakan jenis proyek
}

export interface Shop {
  id: string;
  userId: string;
  profileId: string;
  nama: string;
  linkToko: string;
  asalToko: string;
  awalPromosi: string;
  createdAt: any;
}

export interface Product {
  id: string;
  userId: string;
  profileId: string;
  namaTokoId: string;
  namaToko: string;
  namaProduk: string;
  kategori: string;
  hargaJual: number;
  fotoProduk?: string;
  linkProduk?: string;
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
  profileId: string;
  userId: string;
  judul: string;
  isDone: boolean;
  createdAt: any;
  tanggalTarget: string;
}

export interface Talent {
  id: string;
  nama: string;
  namaAkun: string[]; // Berubah menjadi array untuk mendukung multiple account
  kontak: string;
  status: 'AKTIF' | 'NONAKTIF';
  profileId: string;
  projectId: string;
}

export interface TalentReport {
  id: string;
  talentId: string;
  namaTalent: string;
  namaAkunTalent: string;
  judulKonten: string;
  namaProduk?: string; 
  jumlahProduk?: number; 
  tipeKonten: 'VIDEO' | 'LIVE' | 'PHOTO';
  statusKonten: 'PROSES' | 'REVISI' | 'POSTED';
  jumlahPostingan: number;
  linkPostingan: string[];
  tanggal: any;
  profileId: string;
  projectId: string;
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
  | 'TALENT_DASHBOARD';

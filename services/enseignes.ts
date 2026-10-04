import { supabase } from "./auth";
import { NomIcone } from "@/constants/types";

export type TypeEnseigne = "supermarche" | "boutique" | "pharmacie" | "marche";

export const TYPES_ENSEIGNE: { value: TypeEnseigne; label: string; icone: NomIcone }[] = [
  { value: "supermarche", label: "Supermarché", icone: "cart-outline" },
  { value: "boutique", label: "Boutique", icone: "home-outline" },
  { value: "pharmacie", label: "Pharmacie", icone: "medkit-outline" },
  { value: "marche", label: "Marché", icone: "storefront-outline" },
];

export function infoTypeEnseigne(type: string) {
  return TYPES_ENSEIGNE.find((t) => t.value === type) ?? TYPES_ENSEIGNE[1];
}

export interface Enseigne {
  id: string;
  /** compte qui a inscrit l'enseigne : le seul à pouvoir modifier ses prix */
  ownerId: string | null;
  nom: string;
  type: TypeEnseigne;
  commune: string;
  quartier: string;
  adresse: string;
  telephone: string;
  email: string;
  statut: string;
  dateInscription: string;
}

/** Une ligne de la comparaison : prix officiel d'une enseigne. */
export interface PrixOfficielCompare {
  enseigneId: string;
  enseigneNom: string;
  enseigneType: TypeEnseigne;
  prix: number;
  unite: string;
  dateMiseAJour: string;
}

export interface PrixOfficiel {
  id: string;
  enseigneId: string;
  enseigneNom: string;
  enseigneType: TypeEnseigne;
  produitId: string;
  produitNom: string;
  categorie: "alimentation" | "transport";
  prix: number;
  unite: string;
  dateMiseAJour: string;
}
export async function inscrireEnseigne(data: {
  nom: string;
  type: TypeEnseigne;
  commune: string;
  quartier?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}): Promise<Enseigne> {
  const { data: result, error } = await supabase
    .from("enseignes")
    .insert({
      nom: data.nom,
      type: data.type,
      commune: data.commune,
      quartier: data.quartier ?? "",
      adresse: data.adresse ?? "",
      telephone: data.telephone ?? "",
      email: data.email ?? "",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToEnseigne(result);
}

export async function getEnseigneById(id: string): Promise<Enseigne | null> {
  const { data, error } = await supabase
    .from("enseignes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToEnseigne(data) : null;
}

/** Enseignes inscrites par ce compte. */
export async function getMesEnseignes(ownerId: string): Promise<Enseigne[]> {
  const { data, error } = await supabase
    .from("enseignes")
    .select("*")
    .eq("owner_id", ownerId)
    .order("date_inscription", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToEnseigne);
}

export async function getEnseignesByCommune(commune: string): Promise<Enseigne[]> {
  const { data, error } = await supabase
    .from("enseignes")
    .select("*")
    .eq("commune", commune)
    .eq("statut", "actif")
    .order("nom");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToEnseigne);
}

export async function getPrixOfficielsByEnseigne(enseigneId: string): Promise<PrixOfficiel[]> {
  const { data, error } = await supabase
    .from("prix_officiels")
    .select("*, enseignes(nom, type)")
    .eq("enseigne_id", enseigneId)
    .order("produit_nom");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPrixOfficiel);
}

export async function publierPrixOfficiel(data: {
  enseigneId: string;
  produitId: string;
  produitNom: string;
  categorie: "alimentation" | "transport";
  prix: number;
  unite: string;
}): Promise<void> {
  const { error } = await supabase
    .from("prix_officiels")
    .upsert({
      enseigne_id: data.enseigneId,
      produit_id: data.produitId,
      produit_nom: data.produitNom,
      categorie: data.categorie,
      prix: data.prix,
      unite: data.unite,
      date_mise_a_jour: new Date().toISOString(),
    }, { onConflict: "enseigne_id,produit_id,unite" });
  if (error) throw new Error(error.message);
}

export async function supprimerPrixOfficiel(id: string): Promise<void> {
  const { error } = await supabase.from("prix_officiels").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
/**
 * Prix officiels d'un produit dans une commune, du moins cher au plus cher.
 * Nécessite le réseau : les prix officiels ne sont pas stockés sur le téléphone.
 */
export async function getPrixOfficielsCompares(
  produitId: string,
  commune: string
): Promise<PrixOfficielCompare[]> {
  const { data, error } = await supabase
    .from("prix_officiels")
    .select("*, enseignes!inner(nom, type, commune, statut)")
    .eq("produit_id", produitId)
    .eq("enseignes.commune", commune)
    .eq("enseignes.statut", "actif")
    .order("prix", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((o: any) => ({
    enseigneId: o.enseigne_id,
    enseigneNom: o.enseignes?.nom ?? "",
    enseigneType: o.enseignes?.type ?? "boutique",
    prix: Number(o.prix),
    unite: o.unite,
    dateMiseAJour: o.date_mise_a_jour,
  }));
}

function rowToEnseigne(r: any): Enseigne {
  return {
    id: r.id,
    ownerId: r.owner_id ?? null,
    nom: r.nom,
    type: r.type,
    commune: r.commune,
    quartier: r.quartier ?? "",
    adresse: r.adresse ?? "",
    telephone: r.telephone ?? "",
    email: r.email ?? "",
    statut: r.statut,
    dateInscription: r.date_inscription,
  };
}

function rowToPrixOfficiel(r: any): PrixOfficiel {
  return {
    id: r.id,
    enseigneId: r.enseigne_id,
    enseigneNom: r.enseignes?.nom ?? "",
    enseigneType: r.enseignes?.type ?? "boutique",
    produitId: r.produit_id,
    produitNom: r.produit_nom,
    categorie: r.categorie,
    prix: Number(r.prix),
    unite: r.unite,
    dateMiseAJour: r.date_mise_a_jour,
  };
}
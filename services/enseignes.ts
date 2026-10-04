import { supabase } from "./auth";

export type TypeEnseigne = "supermarche" | "boutique" | "pharmacie" | "marche";

export interface Enseigne {
  id: string;
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
    }, { onConflict: "enseigne_id,produit_id" });
  if (error) throw new Error(error.message);
}

export async function supprimerPrixOfficiel(id: string): Promise<void> {
  const { error } = await supabase.from("prix_officiels").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function getPrixComparatifs(produitId: string, commune: string) {
  const { data: officiels } = await supabase
    .from("prix_officiels")
    .select("*, enseignes(nom, type, commune)")
    .eq("produit_id", produitId)
    .eq("enseignes.commune", commune);

  const { data: signalements } = await supabase
    .from("signalements")
    .select("type_lieu, nom_lieu, prix, unite, nb_confirmations, date_signalement")
    .eq("produit_id", produitId)
    .eq("commune", commune)
    .gte("nb_confirmations", 10)
    .order("date_signalement", { ascending: false })
    .limit(20);

  const result: any[] = [];
  for (const o of officiels ?? []) {
    result.push({ source: "officiel", enseigneNom: o.enseignes?.nom, enseigneType: o.enseignes?.type, prix: o.prix, unite: o.unite, dateMiseAJour: o.date_mise_a_jour });
  }
  for (const s of signalements ?? []) {
    result.push({ source: "signalement", enseigneNom: s.nom_lieu || s.type_lieu, prix: s.prix, unite: s.unite, nbSignalements: s.nb_confirmations, dateMiseAJour: s.date_signalement });
  }
  return result.sort((a, b) => a.prix - b.prix);
}

function rowToEnseigne(r: any): Enseigne {
  return {
    id: r.id,
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
    prix: r.prix,
    unite: r.unite,
    dateMiseAJour: r.date_mise_a_jour,
  };
}
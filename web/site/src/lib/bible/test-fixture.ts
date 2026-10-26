import type { Bible, BibleValue, BibleYamlFile, MarkdownSection } from '@rmp/model';

// A frozen in-memory bible for the unit tests of lib/bible (same characters as the converter's
// fixture). Never imported by the app.

const yaml = (slug: string, title: string, data: BibleValue, path = `bible/donnees/${slug}.yaml`): BibleYamlFile => ({
  kind: 'yaml', path, slug, title, legend: null, data, pdfs: [],
});
const section = (id: string, level: number, heading: string, text: string): MarkdownSection => ({
  id, level, heading, text, html: `<h${level} id="${id}">${heading}</h${level}>\n<p>${text}</p>`,
});

export const fixtureBible = (extra: Bible['files'] = []): Bible => ({
  schemaVersion: 1,
  files: [
    yaml('personnages', 'Personnages', {
      personnages: [
        { id: 'SER', nom: 'Seraphina Blackwood', usuel: 'Seraphina, « Sera »', age: 26, secret: 'S.' },
        { id: 'WHI', nom: 'Lady Margaret Whitmore', usuel: 'Lady Whitmore' },
        { id: 'EVA', nom: 'Evangeline Whitmore', usuel: 'Evangeline, « Eva »' },
        { id: 'MON', nom: 'Lady Monica Fairfax', usuel: 'Lady Fairfax, Monica' },
        { id: 'REG', nom: 'Lord Reginald Fairfax', usuel: 'Lord Fairfax, Reginald' },
        { id: 'BLA', nom: 'Sir Edmund Blackstone', usuel: 'Sir Edmund' },
      ],
      absents_et_figurants: [{ id: 'DOM', nom: 'Le domestique hypnotisé', statut: 'figurant' }],
    }),
    yaml('chronologie', 'Chronologie', {
      phases: [
        { id: 'P0', titre: 'Après-midi', resume: 'Préparatifs' },
        { id: 'P1', titre: 'Les arrivées', resume: 'De 21 h au dernier invité' },
      ],
      groupes: [{ groupe: 'La maison', personnages: ['WHI', 'SER'] }],
      tous: [{ phase: 'P1', quoi: 'Tout le monde arrive.' }],
      evenements: [
        { qui: 'WHI', phase: 'P0', statut: 'decide', quoi: 'Derniers préparatifs.' },
        { qui: ['MON', 'REG'], phase: 'P1', statut: 'decide', quoi: 'Arrivée calculée.', heure: '21:22' },
        { qui: 'SER', phase: ['P0', 'P1'], statut: 'propose', quoi: 'Répète toute la journée.' },
        { qui: 'XYZ', phase: 'P1', statut: 'piste', quoi: 'Un inconnu passe.' },
        { qui: 'BLA', phase: 'P1', statut: 'decide', quoi: 'Arrive en fiacre à l’heure.' },
      ],
      meteo: 'Neige.',
    }),
    yaml('relations', 'Relations', {
      relations: [
        { de: 'SER', vers: 'WHI', valence: -2, ambivalent: true, libelle: 'Menace maternelle', source: 'fiche' },
        { de: 'SER', vers: 'EVA', valence: 2, libelle: 'Meilleure amie', source: 'fiche' },
        { de: 'WHI', vers: 'SER', valence: 1, libelle: 'Protégée', source: 'deduit' },
        { de: 'SER', vers: 'XYZ', valence: 0, libelle: 'Inconnu', source: 'plan' },
      ],
    }),
    yaml('vote', 'Vote', { votes: [{ qui: 'SER', vote: 'detruire' }, { qui: 'WHI', vote: 'suit:SER' }] }),
    yaml(
      'maison',
      'Maison',
      {
        niveaux: [
          {
            cle: 'S', titre: 'Sous-sol', hauteur: '11 ft',
            pieces: [
              { num: 'S1', nom: 'Cour anglaise', cat: 'ext', rect: [0, -8, 36, 0], desc: 'Fossé.' },
              { num: 'S2', nom: 'Office du majordome', cat: 'srv', rect: [0, 0, 10, 14], desc: 'Le verre y est préparé.' },
            ],
          },
        ],
      },
      'bible/lieu/maison.yaml',
    ),
    {
      kind: 'markdown', path: 'bible/notes-de-scene.md', slug: 'notes-de-scene', title: 'Notes de scène',
      sections: [
        section('notes-de-scene-notes-de-scene', 1, 'Notes de scène', ''),
        section('notes-de-scene-seraphina', 2, 'Seraphina', 'Haute tension.'),
        section('notes-de-scene-lady-whitmore', 2, 'Lady Whitmore', 'Inquiète pour sa fille.'),
        section('notes-de-scene-evangeline', 2, 'Evangeline', 'Cherche à parler.'),
        section('notes-de-scene-blackstone', 2, 'Blackstone', 'Pris de court.'),
        section('notes-de-scene-monica-et-reginald', 2, 'Monica et Reginald', 'Le couple.'),
        section('notes-de-scene-personne', 2, 'Personne', 'Section sans personnage.'),
      ],
    },
    ...extra,
  ],
});

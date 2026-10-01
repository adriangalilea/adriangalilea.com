export interface Person {
  /** The display name. */
  name: string;
  /** "@adriangalilea": what a mention types and a sub-line shows. */
  handle?: string;
  /** The picture's URL. Absent, a surface draws its own placeholder. */
  avatar?: string;
  /** An animated picture (mp4) that loops muted over `avatar`, where a surface
   *  animates one. */
  avatarVideo?: string;
}

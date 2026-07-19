import {
  Intro,
  Hero,
  Manifesto,
  ChapterFilm,
  TheDresses,
  Invitation,
} from '@/components/home'
import { MEDIA } from '@/data/images'

export default function Home() {
  return (
    <>
      <Intro />
      <Hero />
      <TheDresses />
      <ChapterFilm image={MEDIA.dressFeature2} />
      <Manifesto />
      <ChapterFilm image={MEDIA.dressFeature1} />
      <Invitation />
    </>
  )
}

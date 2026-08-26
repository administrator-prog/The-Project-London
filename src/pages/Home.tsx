import {
  Intro,
  Hero,
  FirstCollection,
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
      <FirstCollection />
      <TheDresses />
      <ChapterFilm image={MEDIA.dressFeature2} />
      <Manifesto />
      <ChapterFilm image={MEDIA.dressFeature1} />
      <Invitation />
    </>
  )
}

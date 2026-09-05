import CityBlock from './CityBlock';
import Lighting from './Lighting';
import Ground from './Ground';
import Player from '../entities/Player';

/**
 * Root scene graph — ties lighting, the city block, and the player together.
 */
export default function CityScene() {
  return (
    <>
      <Lighting />
      <Ground />
      <CityBlock />
      <Player />
    </>
  );
}
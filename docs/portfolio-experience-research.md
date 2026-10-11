# Portfolio experience research

> Historical research, superseded November 4, 2026. The active user-selected direction is a small walking character with animated reactions in an original coastal garden, recorded in `.impeccable/surfaces/src-components-molecules-ml-explorer-world-vue.md`. Career-passage recommendations below describe earlier exploration, not the current runtime.

Checked November 3, 2026. The recommendation is to evolve the accepted career timeline into a continuous spatial journey, with readable employment facts and direct access to every chapter.

## What the references suggest

The current implementation presents an introduction, a contained timeline, projects, writing, and contact. A stronger experience can give those transitions a shared visual language. Ivan's stated idea, **“I turn complex ideas into usable products,”** supplies a personal basis for that language.

The accepted dark ink, citron, ceramic, and silver palette is the baseline. The career content remains the seven supplied roles, including concurrent employment, with the original companies, positions, and dates. The former career-passage surface brief (since removed), [product brief](../PRODUCT.md), and [resume source](../src/content/resume.json) supply the local constraints.

## References

### Bruno Simon

The current site invites visitors to drive through a 3D world. Its published controls include a map, respawn, quality settings, and keyboard, touch, and gamepad instructions. The owner links the current `folio-2025` source, whose game loop includes vehicle physics, zones, weather, and day/year cycles. This research uses the current site and source rather than the older orange-car screenshots. [Portfolio](https://bruno-simon.com/), [owner source](https://github.com/brunosimon/folio-2025).

**Idea for Ivan.** Give visitors an action that visibly changes their surroundings. Use a clear chapter index to provide orientation and a quick return to the complete history. A driving simulation would add substantial input, physics, and asset work, so the useful principle here is agency.

### Jesse Zhou

Direct desktop exploration confirmed the themed entrance and neon ramen shop. Selecting **About me** moved the camera into a large framed screen with About, Skills, Experience, and Back controls. Selection changes the scale at which content is read. [Portfolio](https://www.jesse-zhou.com/).

Jesse's November 2023 case study describes vanilla Three.js, baked lighting, camera transitions, and image-based screen content with raycast hitboxes. He identifies scalability limitations in parts of that original approach. [Creator's case study](https://jesse-zhou.medium.com/jesses-ramen-case-study-77bae77ab5f0).

**Idea for Ivan.** A chapter selection should produce a deliberate camera arrival. Keep the employment text in a clear HTML layer as the camera moves through the scene. This answers the readability problem that prompted the latest redesign.

### Robby Leonardi

The creator describes the interactive résumé as a combination of résumé and video game, presented separately from his illustration and design portfolios. This is a historical narrative reference. The interactive destination could not be inspected live because of fetch and certificate failures. [Owner homepage](https://rleonardi.com/), [interactive résumé](https://www.rleonardi.com/interactive-resume/).

**Idea for Ivan.** Give the career a sense of progression and arrival. The seven employers can define chapters, with a visible index allowing visitors to choose their own reading order.

### Dennis Snellenberg

A live desktop view confirmed the oversized identity and portrait with Work, About, and Contact navigation. Scrolling reaches background information and recent work. The work index supplies client, location, services, and year information. [Homepage](https://dennissnellenberg.com/), [work index](https://dennissnellenberg.com/work).

**Idea for Ivan.** Use strong scale and composition while making the information routes immediately understandable. Career details, project destinations, and contact should remain easy to locate throughout a more expressive presentation.

### Lusion

Lusion is a creative studio reference. Its site presents 3D visual storytelling, a scroll-to-explore cue, featured work, Menu, and contact access. Full animation sequences were not observed during this inspection. [Studio portfolio](https://lusion.co/).

**Idea for Ivan.** Let one large visual scene establish the experience. The portfolio can use more of the viewport for depth and camera movement, with a quiet reading layer for the selected role.

### Henry Heffernan

The owner's repositories separate the outer portfolio from a 2D operating-system interface. The inner source renders a `Desktop` component. The deployed application's full interaction sequence was not exercised. [Outer source](https://github.com/henryjeff/portfolio-website), [inner source](https://github.com/henryjeff/portfolio-inner-site), [inner entry component](https://github.com/henryjeff/portfolio-inner-site/blob/master/src/App.tsx), [portfolio](https://henryheffernan.com/).

**Idea for Ivan.** Separate the spatial presentation from the readable interface. Three.js can supply motion and depth while HTML owns text, selection, and focus. The user's earlier [Marco reference](https://www.marco.fyi/) also uses workspace/DotOS language, making a familiar interaction metaphor relevant context.

### Nicky Case

Nicky's publishing practice offers playable explanations alongside writing and contact. In the 2014 essay *Explorable Explanations*, Nicky describes combining interaction, visuals, and text according to the subject, with interaction particularly suited to processes and systems. [Owner homepage](https://ncase.me/), [creator's design essay](https://blog.ncase.me/explorable-explanations/), [Evolution of Trust source](https://github.com/ncase/trust).

**Idea for Ivan.** Let one simple action communicate the transformation from complexity to clarity. This connects the portfolio's behavior to Ivan's product-making proposition.

## Recommended direction — Career passage

The homepage becomes a continuous journey along a sculptural career path. Its ink/citron palette and readable company/position/date panel develop the current accepted design.

1. **Arrival.** A large, composed 3D form establishes identity. A brief interaction reveals the path through it. Visitors can immediately use the chapter index, résumé, and contact actions.
2. **Progression.** Normal scrolling moves the camera through seven career chapters. Selecting an employer or using previous/next controls takes the same route to a specific chapter. Each arrival changes framing, depth, and the selected part of the structure.
3. **Reading.** A stable HTML panel shows the original company, complete position, and month/year range. The complete list remains one action away. Overlapping roles stay individually selectable.
4. **Agency.** Direct selection, scrolling, and the optional guided journey share a single chapter-progress state. Manual input interrupts the guided sequence immediately.
5. **Resolution.** The path settles into its final composition, then ordinary scrolling reaches the independent project gallery and contact section.

The principal design work is camera choreography and the relationship between chapters. Role dates express employment history; spacing along the sculpture expresses reading order. A visual transition should not imply an employment relationship, responsibility, or achievement absent from the source.

The implementation should retain lazy initialization, rendering that rests when settled or hidden, native mobile scrolling, and the readable list for reduced motion or unavailable graphics. Camera travel warrants device testing. No frame-rate or accessibility claim follows from the reference sites.

## Alternative — Make it clear

A ceramic/silver assembly begins in a visibly complex arrangement. An optional **Make it clear** action aligns it into the seven-role career spine. The visitor causes the transformation, giving the opening a memorable physical expression of Ivan's proposition.

After that first action, the assembled structure supports direct chapter selection and the existing guided journey. Career facts are available from the start through the HTML panel and list. The key challenge is making the transformation understandable; a deterministic procedural animation can keep the scene smaller than a simulated world.

This direction places more emphasis on direct manipulation. Career passage places more emphasis on continuity and exploration. Start with **Career passage**, prototyping the opening and two chapter transitions before extending the choreography across all seven roles.

## Evidence limits

Live desktop interaction was exercised on Jesse's portfolio and Dennis's homepage. Bruno's screenshot timed out, Lusion reached its loader, and Robby's interactive destination was blocked by a certificate warning. Their applicable findings above come from fetched owner pages, creator accounts, and owner source. Henry and Nicky were assessed through those sources as well. Mobile, keyboard, screen-reader, loading, and performance behavior of the references was not audited.

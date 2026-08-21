import { Component, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-nosotros',
  imports: [],
  templateUrl: './nosotros.html',
  styleUrl: './nosotros.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Nosotros implements AfterViewInit {

  readonly valores = [
    { nombre: 'Excelencia',            descripcion: 'Búsqueda constante de la calidad en lo académico, técnico y humano. Compromiso con la mejora continua.' },
    { nombre: 'Disciplina',             descripcion: 'Formación de hábitos de responsabilidad, orden y autorregulación para la vida personal y profesional.' },
    { nombre: 'Servicio',               descripcion: 'Disposición de aportar conocimiento y habilidades técnicas al servicio de la comunidad y la sociedad.' },
    { nombre: 'Liderazgo',              descripcion: 'Capacidad de guiar, inspirar e influir positivamente en el desarrollo de proyectos transformadores.' },
    { nombre: 'Innovación',             descripcion: 'Creatividad y disposición para proponer soluciones nuevas y prácticas a los problemas reales.' },
    { nombre: 'Integridad',             descripcion: 'Actuación ética, honesta y coherente entre lo que se dice y lo que se hace.' },
    { nombre: 'Inclusión',              descripcion: 'Aceptación y valoración de la diversidad, asegurando oportunidades para todos.' },
    { nombre: 'Responsabilidad Social', descripcion: 'Compromiso con el bienestar colectivo y el desarrollo sostenible de la comunidad.' },
  ];

  readonly principios = [
    { nombre: 'Formación Integral',         descripcion: 'Educación que desarrolla aspectos académicos, técnicos, emocionales, sociales y éticos del estudiante.' },
    { nombre: 'Democracia y Participación', descripcion: 'Voz activa de estudiantes, docentes, padres y sector productivo en la toma de decisiones institucionales.' },
    { nombre: 'Articulación con el Entorno', descripcion: 'Conexión de la educación técnica con las necesidades locales, regionales y nacionales del sector productivo.' },
    { nombre: 'Innovación y Tecnología',    descripcion: 'Incorporación de cambios pedagógicos y tecnológicos que responden a las dinámicas educativas actuales.' },
    { nombre: 'Responsabilidad Social',     descripcion: 'Formación de estudiantes comprometidos con la transformación y desarrollo de su comunidad.' },
  ];

  readonly especiales = [
    'Formación técnica industrial reconocida regionalmente',
    'Educación que equilibra teoría y práctica',
    'Participación democrática de toda la comunidad educativa',
    'Compromiso con la innovación y creatividad',
    'Articulación con empresas del sector productivo',
    'Educación con responsabilidad social y desarrollo sostenible',
    'Tradición e historia educativa en la región',
    'Formación de líderes técnicos con valores humanos',
  ];

  readonly misionTags = ['Formación técnica integral', 'Transformación social', 'Responsabilidad social', 'Innovación', 'Excelencia académica'];
  readonly visionTags = ['Liderazgo regional', 'Profesionales competentes', 'Innovación', 'Compromiso social', 'Desarrollo sostenible'];

  numStr(i: number): string { return String(i + 1).padStart(2, '0'); }

  ngAfterViewInit() {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.nos-reveal').forEach(el => observer.observe(el));
  }
}

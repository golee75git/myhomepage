/**
 * 개인 홈페이지 — 메인 스크립트
 * 이름: ooo
 *
 * doc 분석 반영:
 *   - 타이핑 애니메이션: 역할 2-3개로 제한 (정보 전달 속도 저하 방지)
 *   - 기술 숙련도 % 없음 → 태그 분류 방식 사용
 *   - honeypot 스팸 방지 (reCAPTCHA보다 UX 친화적)
 *   - 포트폴리오 카테고리 필터
 *   - 모션 감소 선호 사용자 대응
 */

'use strict';

/* =====================================================
   유틸리티
   ===================================================== */

/** querySelector 단축 */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * 스크롤 이벤트 쓰로틀링 — 과도한 호출 방지 (약 60fps)
 * @param {Function} fn
 * @param {number}   wait
 */
function throttle(fn, wait = 16) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn(...args); }
  };
}

/** prefers-reduced-motion 감지 */
const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================
   1. 네비게이션 — 스크롤 배경 + 활성 링크
   ===================================================== */
function initNavbar() {
  const navbar = $('#navbar');
  if (!navbar) return;

  const links = $$('.nav-link');

  /** 현재 스크롤 위치와 가장 가까운 섹션 ID 찾기 */
  const getActiveSection = () => {
    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
      10
    ) || 68;

    let active = '';
    $$('section[id]').forEach(sec => {
      if (window.scrollY >= sec.offsetTop - navH - 10) active = sec.id;
    });
    return active;
  };

  const update = () => {
    // 스크롤 50px 이상 → 반투명 배경
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    // 활성 섹션 링크 강조
    const activeId = getActiveSection();
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${activeId}`);
    });
  };

  window.addEventListener('scroll', throttle(update, 80), { passive: true });
  update(); // 초기 실행
}

/* =====================================================
   2. 모바일 햄버거 메뉴
   ===================================================== */
function initMobileMenu() {
  const btn  = $('#hamburger');
  const menu = $('#nav-menu');
  if (!btn || !menu) return;

  const setOpen = (open) => {
    btn.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    // 열렸을 때 페이지 스크롤 잠금
    document.body.style.overflow = open ? 'hidden' : '';
  };

  btn.addEventListener('click', () => setOpen(!btn.classList.contains('open')));

  // 링크 클릭 → 메뉴 닫기
  $$('.nav-link').forEach(a => a.addEventListener('click', () => setOpen(false)));

  // 메뉴 외부 클릭 → 닫기
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });

  // ESC 키 → 닫기
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });
}

/* =====================================================
   3. 히어로 타이핑 애니메이션
   doc 인사이트: 2-3개 역할로 제한
                 너무 많으면 정보 전달이 느려짐
   ===================================================== */
function initTyping() {
  const el = $('#typing-text');
  if (!el) return;

  // doc 권장: 역할 2-3개로 제한
  const roles = [
    '프론트엔드 개발자',
    '창작자',
    '문제 해결사',
  ];

  let roleIdx  = 0;  // 현재 역할 인덱스
  let charIdx  = 0;  // 현재 문자 인덱스
  let deleting = false;

  const SPEED_TYPE =  80;  // 타이핑 속도(ms)
  const SPEED_DEL  =  45;  // 삭제 속도(ms)
  const PAUSE_END  = 2200; // 완성 후 대기(ms)
  const PAUSE_START= 400;  // 삭제 후 대기(ms)

  // 모션 감소 설정이면 첫 역할만 표시하고 종료
  if (prefersReduced()) {
    el.textContent = roles[0];
    return;
  }

  function tick() {
    const current = roles[roleIdx];

    if (!deleting) {
      // 타이핑
      charIdx++;
      el.textContent = current.slice(0, charIdx);

      if (charIdx === current.length) {
        // 완성 → 대기 후 삭제 시작
        deleting = true;
        setTimeout(tick, PAUSE_END);
        return;
      }
    } else {
      // 삭제
      charIdx--;
      el.textContent = current.slice(0, charIdx);

      if (charIdx === 0) {
        // 삭제 완료 → 다음 역할로
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(tick, PAUSE_START);
        return;
      }
    }

    setTimeout(tick, deleting ? SPEED_DEL : SPEED_TYPE);
  }

  tick();
}

/* =====================================================
   4. 스크롤 리빌 애니메이션 (Intersection Observer)
   배포 최적화: 한 번 나타나면 관찰 해제 → 메모리 절약
   ===================================================== */
function initReveal() {
  if (prefersReduced()) {
    // 모션 감소 → 모두 즉시 표시
    $$('.reveal, .fade-up').forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // 한 번만 실행
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  $$('.reveal').forEach(el => observer.observe(el));
}

/* =====================================================
   5. 히어로 fade-up 진입 애니메이션
   ===================================================== */
function initHeroFade() {
  if (prefersReduced()) {
    $$('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }

  // requestAnimationFrame → 첫 프레임 렌더 후 클래스 추가 (CSS transition 보장)
  requestAnimationFrame(() => {
    $$('.hero .fade-up').forEach(el => el.classList.add('visible'));
  });
}

/* =====================================================
   6. 부드러운 스크롤 (앵커 링크 공통)
   CSS scroll-behavior 미지원 환경 보완
   ===================================================== */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const id = anchor.getAttribute('href');
    if (id === '#') return;

    const target = $(id);
    if (!target) return;

    e.preventDefault();

    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
      10
    ) || 68;

    const top = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* =====================================================
   7. 포트폴리오 카테고리 필터
   doc 인사이트: 기술 스택별 필터링으로 방문자 탐색 편의 제공
   ===================================================== */
function initPortfolioFilter() {
  const filterBtns = $$('.filter-btn');
  const cards      = $$('.project-card');

  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // 활성 버튼 교체
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 카드 표시/숨기기
      cards.forEach(card => {
        const categories = card.dataset.category?.split(' ') ?? [];
        const show = filter === 'all' || categories.includes(filter);
        card.classList.toggle('hidden', !show);
      });
    });
  });
}

/* =====================================================
   8. 연락처 폼 — 유효성 검사 + honeypot + 제출
   doc 인사이트:
     - honeypot: 숨겨진 필드를 봇만 채움 → 서버 없이 스팸 차단
     - EmailJS / Formspree 연동 준비 (주석 참조)
   ===================================================== */
function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  const submitBtn = $('#submit-btn', form);
  const successEl = $('#form-ok',    form);

  /* --- 검사 규칙 테이블 --- */
  const fields = {
    name: {
      el:  $('#f-name',  form),
      err: $('#err-name',form),
      rules: [
        { ok: v => v.trim().length > 0,   msg: '이름을 입력해주세요.' },
        { ok: v => v.trim().length >= 2,  msg: '이름은 2자 이상 입력해주세요.' },
      ],
    },
    email: {
      el:  $('#f-email',  form),
      err: $('#err-email',form),
      rules: [
        { ok: v => v.trim().length > 0,                   msg: '이메일을 입력해주세요.' },
        { ok: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: '올바른 이메일 형식이 아닙니다.' },
      ],
    },
    message: {
      el:  $('#f-msg',  form),
      err: $('#err-msg',form),
      rules: [
        { ok: v => v.trim().length > 0,   msg: '메시지를 입력해주세요.' },
        { ok: v => v.trim().length >= 10, msg: '10자 이상 입력해주세요.' },
      ],
    },
  };

  /** 단일 필드 검사 — 오류 메시지 표시/제거 */
  const validate = ({ el, err, rules }) => {
    for (const rule of rules) {
      if (!rule.ok(el.value)) {
        err.textContent = rule.msg;
        el.classList.add('err');
        return false;
      }
    }
    err.textContent = '';
    el.classList.remove('err');
    return true;
  };

  /** 실시간 검사: 오류 상태에서 입력 시 즉시 재검사 */
  Object.values(fields).forEach(f => {
    f.el.addEventListener('input', () => { if (f.el.classList.contains('err')) validate(f); });
    f.el.addEventListener('blur',  () => validate(f));
  });

  /* --- 폼 제출 --- */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // honeypot 필드 확인: 값이 있으면 봇 요청으로 간주 → 조용히 무시
    const honeypot = $('#hp-name', form);
    if (honeypot && honeypot.value.trim() !== '') {
      console.warn('[honeypot] 봇 요청 감지됨 — 제출 차단');
      return;
    }

    // 전체 필드 검사
    const allOk = Object.values(fields)
      .map(f => validate(f))
      .every(Boolean);

    if (!allOk) {
      // 첫 오류 필드로 포커스 이동
      Object.values(fields).find(f => f.el.classList.contains('err'))?.el.focus();
      return;
    }

    // 로딩 상태 활성화
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      /* ══════════════════════════════════════════════════════
         실제 배포 시 아래 옵션 중 하나를 선택하세요:

         [ 옵션 A ] EmailJS (서버 불필요, 무료 플랜 월 200건)
           import emailjs from 'https://cdn.emailjs.com/dist/email.min.js';
           await emailjs.send('SERVICE_ID', 'TEMPLATE_ID', {
             from_name:    fields.name.el.value,
             from_email:   fields.email.el.value,
             message:      fields.message.el.value,
           }, 'PUBLIC_KEY');

         [ 옵션 B ] Formspree (HTML form action 방식)
           form.setAttribute('action', 'https://formspree.io/f/YOUR_FORM_ID');
           form.setAttribute('method', 'POST');
           — 그 후 fetch 대신 기본 submit 사용

         [ 옵션 C ] 백엔드 API
           const res = await fetch('/api/contact', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               name:    fields.name.el.value.trim(),
               email:   fields.email.el.value.trim(),
               message: fields.message.el.value.trim(),
             }),
           });
           if (!res.ok) throw new Error('서버 오류');
         ══════════════════════════════════════════════════════ */

      // 데모용: 1.5초 지연 후 성공 처리
      await new Promise(r => setTimeout(r, 1500));

      // 성공 처리
      form.reset();
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // 5초 후 메시지 숨기기
      setTimeout(() => { successEl.hidden = true; }, 5000);

    } catch (err) {
      alert('전송 중 오류가 발생했습니다.\n전화(010-0000-0000) 또는 이메일로 직접 연락해 주세요.');
      console.error('[Form Error]', err);
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });
}

/* =====================================================
   9. 푸터 연도 자동 갱신
   ===================================================== */
function initFooterYear() {
  const el = $('#footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* =====================================================
   10. 상태 배지 — 텍스트 동적 설정 (선택적 확장)
   doc 인사이트: "협업 가능" 등 배지를 6개월째 업데이트 안 하면 역효과
                 배지 텍스트를 한 곳에서 관리
   ===================================================== */
function initStatusBadge() {
  const badge = $('#status-badge');
  if (!badge) return;

  // 여기서 상태를 쉽게 변경할 수 있음
  const STATUS = {
    available: { text: '협업 가능',   color: '#4ade80', bg: 'rgba(74,222,128,.1)',  border: 'rgba(74,222,128,.25)' },
    busy:      { text: '바쁜 중',     color: '#fb923c', bg: 'rgba(251,146,60,.1)', border: 'rgba(251,146,60,.25)' },
    away:      { text: '잠시 자리 비움', color: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.2)' },
  };

  const current = STATUS.available; // ← 상태 변경 시 이 값만 수정
  const dot  = badge.querySelector('.status-dot');
  const span = badge.querySelector('span:last-child');

  if (span)          span.textContent = current.text;
  if (dot)           dot.style.background  = current.color;
  badge.style.color  = current.color;
  badge.style.background = current.bg;
  badge.style.borderColor = current.border;
}

/* =====================================================
   초기화 — DOM 준비 완료 후 순서대로 실행
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initHeroFade();        // 히어로 먼저 표시
  initTyping();          // 타이핑 애니메이션
  initReveal();          // 스크롤 리빌
  initSmoothScroll();    // 앵커 스크롤
  initPortfolioFilter(); // 포트폴리오 필터
  initContactForm();     // 폼 유효성 + honeypot
  initFooterYear();      // 푸터 연도
  initStatusBadge();     // 상태 배지
});
